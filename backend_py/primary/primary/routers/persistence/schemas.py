from enum import Enum
from typing import List, Optional, TypeAlias
from pydantic import BaseModel


class Dashboard(BaseModel):
    id: str
    name: str
    description: str
    layout: str