def is_safe_redirect_target(target: object) -> bool:
    """
    Checks if the given target URL is a safe redirect target.
    """
    if not isinstance(target, str):
        return False

    if not target.startswith("/"):
        return False

    if target.startswith("//"):
        return False

    if "\\" in target:
        return False

    # Reject ASCII control characters
    for character in target:
        code_point = ord(character)
        if code_point < 32 or code_point == 127:
            return False

    return True
