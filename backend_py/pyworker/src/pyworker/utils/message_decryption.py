from cryptography.fernet import Fernet

# Module-level singleton
_fernet: Fernet | None = None  # pylint: disable=invalid-name


def initialize(fernet_key: str) -> None:
    global _fernet  # pylint: disable=global-statement
    _fernet = Fernet(fernet_key)


def decrypt_data_to_str(data: str | bytes) -> str:
    if _fernet is None:
        raise RuntimeError("Fernet not initialized, call initialize() first")

    if isinstance(data, str):
        data = data.encode()

    decrypted_bytes = _fernet.decrypt(data)

    return decrypted_bytes.decode()
