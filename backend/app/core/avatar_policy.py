import re

MAX_AVATAR_BASE64_LEN = 700_000
DATA_URL_PATTERN = re.compile(r"^data:image/(jpeg|jpg|png|webp|gif);base64,", re.IGNORECASE)


def normalize_avatar_base64(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_AVATAR_BASE64_LEN:
        raise ValueError("La imagen es demasiado grande. Usa una foto de menos de 500 KB.")
    if not DATA_URL_PATTERN.match(cleaned):
        raise ValueError("Formato no válido. Solo JPG, PNG, WEBP o GIF en base64.")
    return cleaned
