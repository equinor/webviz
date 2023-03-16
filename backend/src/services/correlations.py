from typing import List, Union
from enum import Enum

import pandas as pd
from pydantic import BaseModel

from .sumo_access.parameter_access import (
    EnsembleSensitivity,
    SENSITIVITY_TYPES,
)


class EnsembleResponse(BaseModel):
    realizations: List[int]
    values: List[float]
    name: str


class EnsembleSensitivitiesResponse(BaseModel):
    sensitivities: List[EnsembleSensitivity]
    responses: List[EnsembleResponse]


class SensResponseColumns(Enum):
    SENSITIVITY = "Sensitivity"
    CASE = "Case"
    TYPE = "Type"
    REALIZATION = "Realization"
    VALUE = "Value"


class SensResponseMeanColumns(Enum):
    SENSITIVITY = "Sensitivity"
    CASE = "Case"
    TYPE = "Type"
    MEAN_VALUE = "Mean"
    MEAN_REF_VALUE = "MeanRef"
    REALIZATIONS = "Realizations"


class SensitivityResponseAverage(BaseModel):
    sensitivity: str
    case: str
    type: str
    mean_value: float
    mean_reference_value: float
    realizations: List[int]


HARDCODED_SENSITIVITY_REFERENCE_NAME = "ref"


def calculate_sensitivity_averages(
    ensemble_sensitivities: List[EnsembleSensitivity],
    ensemble_response: List[EnsembleResponse],
    sensitivity_reference_name: str,
) -> List[SensitivityResponseAverage]:
    """Calculate sensitivities for a numerical response from each realization"""

    sensitivity_dframe = pd.DataFrame(
        columns=[
            SensResponseColumns.SENSITIVITY,
            SensResponseColumns.CASE,
            SensResponseColumns.TYPE,
            SensResponseColumns.REALIZATION,
        ],
        data=[
            (sensitivity.name, case.name, sensitivity.type, realization)
            for sensitivity in ensemble_sensitivities
            for case in sensitivity.cases
            for realization in case.realizations
        ],
    )
    if not sensitivity_reference_name in sensitivity_dframe[SensResponseColumns.SENSITIVITY].unique():
        raise ValueError("Sensitivity reference name not found in ensemble sensitivities")

    response_dframe = pd.DataFrame(
        columns=[SensResponseColumns.REALIZATION, SensResponseColumns.VALUE],
        data=zip(ensemble_response.realizations, ensemble_response.values),
    )
    compute_dframe = pd.merge(sensitivity_dframe, response_dframe, on=SensResponseColumns.REALIZATION)

    reference_average = compute_dframe.loc[
        compute_dframe[SensResponseColumns.SENSITIVITY] == sensitivity_reference_name
    ][SensResponseColumns.VALUE].mean()

    sensitivity_response_averages: List[SensitivityResponseAverage] = []
    # Should be a function or 3
    for sensitivity_name, dframe_per_sensitivity in compute_dframe.groupby(SensResponseColumns.SENSITIVITY):
        # Excluding cases if `ref` is used as `SENSNAME`, and only one realization
        # is present for this `SENSNAME`. There is basically nothing to do.
        if (
            sensitivity_name == HARDCODED_SENSITIVITY_REFERENCE_NAME
            and len(dframe_per_sensitivity[SensResponseColumns.REALIZATION].unique()) == 1
        ):
            continue

        # If type is scenario get the mean for each case
        if (dframe_per_sensitivity[SensResponseColumns.TYPE] == SENSITIVITY_TYPES.SCENARIO).all():
            for case_name, dframe_per_case in dframe_per_sensitivity.groupby(SensResponseColumns.CASE):
                value_average = dframe_per_case[SensResponseColumns.VALUE].mean()
                value_average_reference = _scale_to_reference(
                    "Percentage",
                    reference_average,
                    value_average,
                )
                realizations = list(map(int, dframe_per_case[SensResponseColumns.REALIZATION]))

                sensitivity_response_averages.append(
                    SensitivityResponseAverage(
                        sensitivity=sensitivity_name,
                        case=case_name,
                        type=SENSITIVITY_TYPES.SCENARIO,
                        mean_value=value_average,
                        mean_reference_value=value_average_reference,
                        realizations=realizations,
                    )
                )
        # If type is montecarlo get the p90 and p10 and fake two cases
        elif (dframe_per_sensitivity[SensResponseColumns.TYPE] == SENSITIVITY_TYPES.MONTECARLO).all():
            p90_average = dframe_per_sensitivity[SensResponseColumns.VALUE].quantile(0.10)
            p90_average_reference = _scale_to_reference(
                "Percentage",
                reference_average,
                p90_average,
            )
            p90_realizations = list(
                map(
                    int,
                    dframe_per_sensitivity.loc[dframe_per_sensitivity[SensResponseColumns.VALUE] <= reference_average][
                        SensResponseColumns.REALIZATION
                    ],
                )
            )
            p10_average = dframe_per_sensitivity[SensResponseColumns.VALUE].quantile(0.90)
            p10_average_reference = _scale_to_reference(
                "Percentage",
                reference_average,
                p10_average,
            )

            p10_realizations = list(
                map(
                    int,
                    dframe_per_sensitivity.loc[dframe_per_sensitivity[SensResponseColumns.VALUE] > reference_average][
                        SensResponseColumns.REALIZATION
                    ],
                )
            )
            sensitivity_response_averages.append(
                SensitivityResponseAverage(
                    sensitivity=sensitivity_name,
                    case="P90",
                    type=SENSITIVITY_TYPES.MONTECARLO,
                    mean_value=p90_average,
                    mean_reference_value=p90_average_reference,
                    realizations=p90_realizations,
                )
            )
            sensitivity_response_averages.append(
                SensitivityResponseAverage(
                    sensitivity=sensitivity_name,
                    case="P10",
                    type=SENSITIVITY_TYPES.MONTECARLO,
                    mean_value=p10_average,
                    mean_reference_value=p10_average_reference,
                    realizations=p10_realizations,
                )
            )
        return sensitivity_response_averages


def _scale_to_reference(scale: str, reference_average: float, value_average: float):
    value_ref = value_average - reference_average
    if scale == "Percentage":
        return (100 * (value_ref / reference_average)) if reference_average != 0 else 0
    return value_ref
