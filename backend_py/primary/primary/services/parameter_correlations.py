from typing import List

import pandas as pd

from primary.services.sumo_access.parameter_access import EnsembleParameter
from primary.services.sumo_access.generic_types import EnsembleScalarResponse, EnsembleCorrelations


def correlate_parameters_with_response(
    ensemble_parameters: List[EnsembleParameter], response: EnsembleScalarResponse
) -> EnsembleCorrelations:
    """Correlates ensemble parameters values with an ensemble response"""
    parameter_dframe = _numerical_parameters_to_pandas_table(ensemble_parameters)
    response_dframe = _ensemble_scalar_response_to_pandas_table(response)

    # Merge dframes on real for consistency
    dframe = pd.merge(parameter_dframe, response_dframe, on="realization")
    dframe.set_index("realization", inplace=True)

    # Separate response out as a series and correlate
    response_series = dframe["response"]
    dframe = dframe.drop(columns=["response"])
    corr_series = dframe.corrwith(response_series)

    # Sort correlations in descending order
    sorted_corr_series = corr_series.reindex(corr_series.abs().sort_values().index)

    return EnsembleCorrelations(names=sorted_corr_series.index.to_list(), values=sorted_corr_series.to_list())


def _numerical_parameters_to_pandas_table(
    ensemble_parameters: List[EnsembleParameter],
) -> pd.DataFrame:
    """Convert a list of ensemble parameters to a pandas dataframe"""
    data = []
    for parameter in ensemble_parameters:
        # Skip non-numerical parameters
        if not parameter.is_numerical:
            continue
        # Skip parameters where all values are equal
        if all(value == parameter.values[0] for value in parameter.values[1:]):
            continue
        for real, value in zip(parameter.realizations, parameter.values):
            data.append({"name": parameter.name, "realization": real, "value": value})

    # Convert the list of dictionaries to a pandas DataFrame
    df = pd.DataFrame(data)

    # Pivot name column to individual columns per parameter
    pivot_df = df.pivot(index="realization", columns="name", values="value").reset_index()
    return pivot_df


def _ensemble_scalar_response_to_pandas_table(
    ensemble_response: EnsembleScalarResponse,
) -> pd.DataFrame:
    """Convert a ensemble scalar response to a pandas dataframe"""
    data = []
    for real, value in zip(ensemble_response.realizations, ensemble_response.values):
        data.append({"realization": real, "response": value})
    df = pd.DataFrame(data)
    return df
