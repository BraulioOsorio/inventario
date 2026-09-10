import re

PASSWORD_RULES: list[tuple[str, str]] = [
    (r".{8,}", "Mínimo 8 caracteres"),
    (r"[A-Z]", "Debe contener mayúscula"),
    (r"[a-z]", "Debe contener minúscula"),
    (r"\d", "Debe contener número"),
    (r"[^\w\s]", "Debe contener símbolo"),
]


def password_validation_errors(password: str) -> list[str]:
    return [msg for pattern, msg in PASSWORD_RULES if not re.search(pattern, password)]


def assert_strong_password(password: str) -> None:
    errors = password_validation_errors(password)
    if errors:
        raise ValueError("; ".join(errors))
