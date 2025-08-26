import datetime


def timestamp_utc_ms_to_iso_str(timestamp_utc_ms: int, always_include_milliseconds: bool = True) -> str:
    """
    Convert integer timestamp in milliseconds UTC to ISO 8601 string
    The returned string will always be one of these formats:
      YYYY-MM-DDTHH:MM:SS.fffZ
      YYYY-MM-DDTHH:MM:SSZ
    """
    dt_obj = datetime.datetime.fromtimestamp(timestamp_utc_ms / 1000, tz=datetime.timezone.utc)

    # Include milliseconds only if present or forced by flag
    if dt_obj.microsecond != 0 or always_include_milliseconds:
        isostr = dt_obj.isoformat(timespec="milliseconds")
    else:
        isostr = dt_obj.isoformat()

    # Since dt_obj has time zone, isoformat() always returns string with UTC offset, which for UTC will be: "+00:00"
    # Replace with Z which is the convention we use
    isostr = isostr.replace("+00:00", "Z")

    return isostr


def timestamp_utc_ms_to_iso_str_strip_tz(timestamp_utc_ms: int, always_include_milliseconds: bool = True) -> str:
    """
    Same as timestamp_utc_ms_to_iso_str(), but does not include timezone information (no trailing Z)
    """
    isostr_with_tz = timestamp_utc_ms_to_iso_str(timestamp_utc_ms, always_include_milliseconds)
    return isostr_with_tz.replace("Z", "")


def timestamp_utc_ms_to_compact_iso_str(timestamp_utc_ms: int) -> str:
    """
    Convert integer timestamp in milliseconds a compact UTC to ISO 8601 string
    The returned string will be one of these formats depending on the input data:
      YYYY-MM-DDTHH:MM:SS.fffZ
      YYYY-MM-DDTHH:MM:SSZ
      YYYY-MM-DD
    """
    dt_obj = datetime.datetime.fromtimestamp(timestamp_utc_ms / 1000, tz=datetime.timezone.utc)

    if dt_obj.hour == 0 and dt_obj.minute == 0 and dt_obj.second == 0 and dt_obj.microsecond == 0:
        isostr = dt_obj.date().isoformat()
    elif dt_obj.microsecond == 0:
        isostr = dt_obj.isoformat(timespec="seconds")
    else:
        isostr = dt_obj.isoformat(timespec="milliseconds")

    # Since dt_obj has time zone, isoformat() always returns string with UTC offset, which for UTC will be: "+00:00"
    # Replace with Z which is the convention we use
    isostr = isostr.replace("+00:00", "Z")

    return isostr


def iso_str_to_timestamp_utc_ms(iso_str: str) -> int:
    """
    Convert ISO 8601 string to timestamp in milliseconds UTC
    Note that for date-time strings that do not contain timezone information, this function assumes
    that the date-time string is in UTC
    """
    dt_obj = datetime.datetime.fromisoformat(iso_str)

    if dt_obj.tzinfo is None:
        # Assume UTC if no timezone is given
        dt_obj = dt_obj.replace(tzinfo=datetime.timezone.utc)

    return int(dt_obj.timestamp() * 1000)
