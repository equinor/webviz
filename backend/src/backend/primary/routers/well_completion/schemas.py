from typing import Any, Dict

from pydantic import BaseModel


class WellCompletionData(BaseModel):
    json_data: Dict[str, Any]
