from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.repositories.product_repository import ProductRepository
from app.services.image_storage import product_has_image, read_product_image_bytes, read_user_avatar_bytes

router = APIRouter()


@router.get("/products/{product_id}/image")
def product_image(
    product_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    product = ProductRepository(db).get(product_id, user.id)
    if not product or not product_has_image(product):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    payload = read_product_image_bytes(product)
    if not payload:
        raise HTTPException(status_code=404, detail="Imagen no disponible")
    data, mime = payload
    return Response(content=data, media_type=mime, headers={"Cache-Control": "private, max-age=3600"})


@router.get("/me/avatar")
def my_avatar(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    db.refresh(user)
    payload = read_user_avatar_bytes(user)
    if not payload:
        raise HTTPException(status_code=404, detail="Sin avatar")
    data, mime = payload
    return Response(content=data, media_type=mime, headers={"Cache-Control": "private, max-age=600"})
