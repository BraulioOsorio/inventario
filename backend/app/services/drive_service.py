"""Google Drive (cuenta única, carpeta por usuario en el árbol)."""
from __future__ import annotations

import base64
import json
import re
from functools import lru_cache
from io import BytesIO
from uuid import UUID

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.core.avatar_policy import DATA_URL_PATTERN
from app.core.config import settings

DRIVE_SCOPES = ("https://www.googleapis.com/auth/drive",)

_DATA_URL_TAIL = re.compile(r"^data:image/[\w+]+;base64,", re.IGNORECASE)


def drive_enabled() -> bool:
    folder = (settings.GOOGLE_DRIVE_FOLDER_ID or "").strip()
    raw = (settings.GOOGLE_SERVICE_ACCOUNT_JSON or "").strip()
    return bool(folder and raw)


@lru_cache
def _drive_service():
    info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
    creds = service_account.Credentials.from_service_account_info(info, scopes=DRIVE_SCOPES)
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _root_folder_id() -> str:
    return settings.GOOGLE_DRIVE_FOLDER_ID.strip()


def _find_child_folder(parent_id: str, name: str) -> str | None:
    service = _drive_service()
    safe_name = name.replace("'", "\\'")
    q = (
        f"'{parent_id}' in parents and name='{safe_name}' "
        "and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    res = service.files().list(q=q, fields="files(id)", pageSize=1, supportsAllDrives=True).execute()
    files = res.get("files") or []
    return files[0]["id"] if files else None


def _ensure_child_folder(parent_id: str, name: str) -> str:
    existing = _find_child_folder(parent_id, name)
    if existing:
        return existing
    service = _drive_service()
    body = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    created = service.files().create(body=body, fields="id", supportsAllDrives=True).execute()
    return created["id"]


def owner_product_folder(owner_id: UUID) -> str:
    root = _root_folder_id()
    usuarios = _ensure_child_folder(root, "usuarios")
    owner = _ensure_child_folder(usuarios, str(owner_id))
    return _ensure_child_folder(owner, "productos")


def owner_profile_folder(owner_id: UUID) -> str:
    root = _root_folder_id()
    usuarios = _ensure_child_folder(root, "usuarios")
    owner = _ensure_child_folder(usuarios, str(owner_id))
    return _ensure_child_folder(owner, "perfil")


def parse_data_url(data_url: str) -> tuple[bytes, str, str]:
    match = DATA_URL_PATTERN.match(data_url.strip())
    if not match:
        raise ValueError("Formato de imagen no válido")
    ext = match.group(1).lower()
    mime = "image/jpeg" if ext in {"jpg", "jpeg"} else f"image/{ext}"
    payload = data_url[match.end() :]
    return base64.b64decode(payload), mime, ext


def upload_bytes(parent_folder_id: str, filename: str, data: bytes, mime_type: str) -> str:
    service = _drive_service()
    media = MediaIoBaseUpload(BytesIO(data), mimetype=mime_type, resumable=False)
    body = {"name": filename, "parents": [parent_folder_id]}
    created = service.files().create(
        body=body,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return created["id"]


def delete_file(file_id: str | None) -> None:
    if not file_id or not drive_enabled():
        return
    try:
        _drive_service().files().delete(fileId=file_id, supportsAllDrives=True).execute()
    except Exception:
        pass


def download_file(file_id: str) -> tuple[bytes, str]:
    service = _drive_service()
    meta = service.files().get(fileId=file_id, fields="mimeType", supportsAllDrives=True).execute()
    mime = meta.get("mimeType") or "application/octet-stream"
    content = service.files().get_media(fileId=file_id).execute()
    return content, mime


def upload_product_image(owner_id: UUID, product_id: UUID, data_url: str) -> str:
    data, mime, ext = parse_data_url(data_url)
    folder = owner_product_folder(owner_id)
    filename = f"{product_id}.{ext}"
    return upload_bytes(folder, filename, data, mime)


def upload_avatar_image(owner_id: UUID, data_url: str) -> str:
    data, mime, ext = parse_data_url(data_url)
    folder = owner_profile_folder(owner_id)
    filename = f"avatar.{ext}"
    return upload_bytes(folder, filename, data, mime)


def data_url_from_bytes(data: bytes, mime: str) -> str:
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def decode_inline_base64(value: str) -> tuple[bytes, str]:
    cleaned = value.strip()
    match = _DATA_URL_TAIL.match(cleaned)
    if match:
        mime_part = cleaned[5 : cleaned.index(";")].strip()
        mime = mime_part if "/" in mime_part else "image/jpeg"
        data = base64.b64decode(cleaned[match.end() :])
        return data, mime
    data = base64.b64decode(cleaned)
    return data, "image/jpeg"
