from typing import List

from pydantic import BaseModel

class RelPermTableInfo(BaseModel):
    table_name: str
    column_names: List[str]
