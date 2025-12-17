from dataclasses import dataclass
from enum import StrEnum


@dataclass
class EnsembleParameter:
    """Description/data for a single parameter in an ensemble"""

    # pylint: disable=too-many-instance-attributes
    name: str
    is_logarithmic: bool
    is_discrete: bool  # values are string or integer
    is_constant: bool  # all values are equal
    realizations: list[int]
    values: list[float] | list[int] | list[str]
    group_name: str | None = None
    descriptive_name: str | None = None


class SensitivityType(StrEnum):
    MONTECARLO = "montecarlo"
    SCENARIO = "scenario"


@dataclass
class EnsembleSensitivityCase:
    """Description/data for a single sensitivity case in an ensemble"""

    name: str
    realizations: list[int]


@dataclass
class EnsembleSensitivity:
    """Description/data for a single sensitivity in an ensemble"""

    name: str
    type: SensitivityType
    cases: list[EnsembleSensitivityCase]
