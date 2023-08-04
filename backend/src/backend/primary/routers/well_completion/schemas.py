from pydantic import BaseModel

from src.services.utils.well_completion_utils import WellCompletionDataSet


class WellCompletionData(BaseModel):
    json_data: WellCompletionDataSet
