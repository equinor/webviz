from typing import List

from dataclasses import dataclass


@dataclass
class RelPermTableInfo:
    table_name: str
    column_names: List[str]


@dataclass
class RealizationBlobid:
    blob_name: str
    realization_id: str
