from webviz_pkg.core_utils.timestamp_utils import timestamp_utc_ms_to_iso_str, timestamp_utc_ms_to_compact_iso_str
from webviz_pkg.core_utils.timestamp_utils import iso_str_to_timestamp_utc_ms


def test_convert_timestamp_to_iso_str() -> None:
    # Test data generated with: https://www.timestamp-converter.com/
    assert timestamp_utc_ms_to_iso_str(1514764800000) == "2018-01-01T00:00:00.000Z"
    assert timestamp_utc_ms_to_iso_str(1514764800000, always_include_milliseconds=False) == "2018-01-01T00:00:00Z"

    assert timestamp_utc_ms_to_iso_str(1514764800001) == "2018-01-01T00:00:00.001Z"
    assert timestamp_utc_ms_to_iso_str(1514764799999) == "2017-12-31T23:59:59.999Z"


def test_convert_timestamp_to_compact_iso_str() -> None:
    # Test data generated with: https://www.timestamp-converter.com/
    assert timestamp_utc_ms_to_compact_iso_str(1514764799999) == "2017-12-31T23:59:59.999Z"
    assert timestamp_utc_ms_to_compact_iso_str(1514764800001) == "2018-01-01T00:00:00.001Z"
    assert timestamp_utc_ms_to_compact_iso_str(1514764801000) == "2018-01-01T00:00:01Z"
    assert timestamp_utc_ms_to_compact_iso_str(1514764800000) == "2018-01-01"


def test_convert_iso_str_to_timestamp() -> None:
    # Test data generated with: https://www.timestamp-converter.com/
    assert iso_str_to_timestamp_utc_ms("2018-01-01T00:00:00Z") == 1514764800000
    assert iso_str_to_timestamp_utc_ms("2018-01-01T00:00:00") == 1514764800000

    assert iso_str_to_timestamp_utc_ms("2018-01-01") == 1514764800000

    assert iso_str_to_timestamp_utc_ms("2018-01-01T00:00:00.001") == 1514764800001
    assert iso_str_to_timestamp_utc_ms("2018-01-01T00:00:00.001Z") == 1514764800001
    assert iso_str_to_timestamp_utc_ms("2017-12-31T23:59:59.999") == 1514764799999
    assert iso_str_to_timestamp_utc_ms("2017-12-31T23:59:59.999Z") == 1514764799999
