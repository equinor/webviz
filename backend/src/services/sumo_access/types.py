from typing import List, Optional, Union

from pydantic import BaseModel


class SumoEnsembleParameter(BaseModel):
    name: str
    groupname: Optional[str]
    values: List[Union[str, int, float]]
    realizations: List[int]
