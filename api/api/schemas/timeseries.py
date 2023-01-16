from typing import List, Optional
from enum import Enum
import datetime

from pydantic import BaseModel


class VectorDescription(BaseModel):
    name: str
    descriptive_name: str
    type: str


class VectorMetadata(BaseModel):
    unit: str
    is_total: bool
    is_rate: bool
    is_historical: bool
    keyword: str
    wgname: Optional[str]
    get_num: Optional[int]


class VectorRealizationData(BaseModel):
    realization: int
    timestamps: List[datetime.datetime]
    values: List[float]


class VectorStatisticData(BaseModel):
    statistic: str
    realizations: List[int]
    timestamps: List[datetime.datetime]
    values: List[float]


class Frequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class VariableVectorMapInfo(BaseModel):
    """
    Variable vector map pair
    `Description`:
    Dictionary with pair of varible name and mapped vector name
    `Required keys`:
    * variableName: str, variable name
    * vectorName: List[str], vector name
    """

    variableName: str
    vectorName: List[str]


class VectorExpressionInfo(BaseModel):
    """

    `Description`:
    Dictionary with all required items for an expression
    `Required keys`:
    name: str, expression name
    description:str, description of mathematical expression
    expression: str, mathematical expression
    id: str, identifier string
    variableVectorMap: List[VariableVectorMapInfo], List of variable- and vector name pairs
    isValid: bool, valid state for expression
    isDeletable: bool, True if expression can be deleted, False otherwise
    """

    name: str
    expression: str
    id: str
    variableVectorMap: List[VariableVectorMapInfo]
    isValid: bool
    isDeletable: bool
