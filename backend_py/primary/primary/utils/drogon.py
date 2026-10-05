from typing import Optional


def is_drogon_identifier(
    field_identifier: Optional[str] = None,
    wellbore_uuid: Optional[str] = None,
    strat_column_identifier: Optional[str] = None,
) -> bool:
    """
    Checks if an element's identifier is for the drogon mock.
    """
    if field_identifier == "DROGON":
        return True
    if wellbore_uuid is not None and wellbore_uuid.startswith("drogon_"):
        return True
    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        return True

    return False
