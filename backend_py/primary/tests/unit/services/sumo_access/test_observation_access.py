import datetime

import pytest
import pyarrow as pa

from webviz_services.service_exceptions import InvalidDataError
from webviz_services.sumo_access.observation_access import _create_summary_observations_from_table


def test_create_summary_observations_from_table_groups_by_response_key_and_returns_dates() -> None:
    schema_fields: list[tuple[str, pa.DataType]] = [
        ("response_key", pa.string()),
        ("time", pa.timestamp("ms")),
        ("observation_value", pa.float32()),
        ("observation_error", pa.float32()),
        ("east", pa.float32()),
        ("north", pa.float32()),
    ]

    table = pa.table(
        {
            "response_key": ["WGOR:A1", "WWCT:A1", "WGOR:A1"],
            "time": [
                datetime.datetime(2018, 3, 30),
                datetime.datetime(2018, 3, 30),
                datetime.datetime(2018, 6, 22),
            ],
            "observation_value": [138.32457, 0.0000029900082, 137.20663],
            "observation_error": [50.0, 0.1, 50.0],
            "east": [None, None, None],
            "north": [None, None, None],
        },
        schema=pa.schema(schema_fields),
    )

    result = _create_summary_observations_from_table(table)

    assert [vector.vector_name for vector in result] == ["WGOR:A1", "WWCT:A1"]
    assert [observation.date for observation in result[0].observations] == [
        "2018-03-30T00:00:00",
        "2018-06-22T00:00:00",
    ]
    assert result[0].observations[0].value == pytest.approx(138.32457)
    assert result[0].observations[0].error == pytest.approx(50.0)
    assert result[0].observations[0].label == "WGOR:A1"
    assert result[1].observations[0].date == "2018-03-30T00:00:00"
    assert result[1].observations[0].value == pytest.approx(0.0000029900082)
    assert result[1].observations[0].error == pytest.approx(0.1)


def test_create_summary_observations_from_table_rejects_invalid_payload() -> None:
    table = pa.table(
        {
            "response_key": ["WGOR:A1"],
            "time": [datetime.datetime(2018, 3, 30)],
            "observation_value": [138.32457],
        }
    )

    with pytest.raises(InvalidDataError, match="Invalid summary observations table"):
        _create_summary_observations_from_table(table)
