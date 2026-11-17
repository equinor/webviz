from dataclasses import dataclass, field
from enum import StrEnum


@dataclass(frozen=True)
class ParameterSourceEnsemble:
    """The restart ensemble a parameter was inherited from"""

    case_uuid: str
    case_name: str
    ensemble_name: str


@dataclass
class EnsembleParameter:
    """Description/data for a single parameter in an ensemble"""

    # pylint: disable=too-many-instance-attributes
    name: str
    is_logarithmic: bool
    is_discrete: bool  # values are from a discrete distribution derrf/dunif/raw
    is_constant: bool  # all values are equal
    is_numerical: bool  # values are numerical (int or float)
    realizations: list[int]
    values: list[float] | list[int] | list[str]
    group_name: str | None = None
    descriptive_name: str | None = None
    source_ensemble: ParameterSourceEnsemble | None = None  # None means the ensemble's own parameter


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


@dataclass
class ParametersAndSensitivities:
    """Parameters and sensitivities for an ensemble, with non-fatal user-facing warnings."""

    parameters: list[EnsembleParameter]
    sensitivities: list[EnsembleSensitivity]
    warnings: list[str] = field(default_factory=list)
    # True if the restart chain broke on an ensemble that could not be found (deleted or no access)
    has_unresolved_restart_ensemble: bool = False
