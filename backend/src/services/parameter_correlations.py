from typing import List

import pandas as pd

from .sumo_access.parameter_access import EnsembleParameter
from .sumo_access.generic_types import EnsembleScalarResponse, EnsembleCorrelations


def correlate_parameters_with_response(ensemble_parameters:List[EnsembleParameter], response:EnsembleScalarResponse):
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
    sorted_corr_series = corr_series.reindex(corr_series.abs().sort_values(ascending=False).index)

    return EnsembleCorrelations(names=sorted_corr_series.index.to_list(), values=sorted_corr_series.to_list())

def _numerical_parameters_to_pandas_table(ensemble_parameters:List[EnsembleParameter]):
    """Convert a list of ensemble parameters to a pandas dataframe"""
    data = []
    for ep in ensemble_parameters:
        # Skip non-numerical parameters
        if not ep.is_numerical:
            continue
        # Skip parameters where all values are equal
        if all(value == ep.values[0] for value in ep.values[1:]):
            continue
        for r, v in zip(ep.realizations, ep.values):
            data.append({"name": ep.name, "realization": r, "value": v})
    

    # Convert the list of dictionaries to a pandas DataFrame
    df = pd.DataFrame(data)

    # Pivot name column to individual columns per parameter
    pivot_df = df.pivot(index='realization', columns='name', values='value').reset_index()
    return pivot_df

def _ensemble_scalar_response_to_pandas_table(ensemble_response:EnsembleScalarResponse):
    """Convert a ensemble scalar response to a pandas dataframe"""
    data = []
    for r, v in zip(ensemble_response.realizations, ensemble_response.values):
            data.append({ "realization": r, "response": v})
    df = pd.DataFrame(data)
    return df
    