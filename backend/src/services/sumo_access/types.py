from typing import List, Optional, Union

from pydantic import BaseModel


class SumoEnsembleParameter(BaseModel):
    name: str
    groupname: Optional[str]
    values: Union[List[float], List[int], List[str]]
    realizations: List[int]
