from primary.services.sumo_access.well_completions_types import Completions

from . import schemas

def convert_completions_to_schema(completions: Completions)->schemas.Completions:
    return schemas.Completions(
        sortedCompletionDateIndices=completions.sorted_completion_date_indices,
        open=completions.open,
        shut=completions.shut,
        khMean=completions.kh_mean,
        khMin=completions.kh_min,
        khMax=completions.kh_max
    )