from typing import List, Optional
from enum import Enum
import datetime

from pydantic import BaseModel


class VectorDescription(BaseModel):
    name: str
    descriptive_name: str
    has_historical: bool
    """ Ytelse vs plassering av business logikk
    group: str
    subgroup: str
    unit:str
    is_rate:bool
"""


class VectorMetadata(BaseModel):
    unit: str
    is_total: bool
    is_rate: bool
    _historical: bool
    keyword: str
    wgname: Optional[str]
    get_num: Optional[int]


class VectorHistoricalData(BaseModel):
    timestamps: List[datetime.datetime]
    values: List[float]


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


class StatisticsOptions(str, Enum):
    """
    Type definition of statistics options
    """

    MEAN = "Mean"
    MIN = "Min"
    MAX = "Max"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class VectorExpressionInfo(BaseModel):
    """

    `Description`:
    Dictionary with all required items for an expression
    `Required keys`:

    expression: str, mathematical expression
    variable_names: List[str], list of variable names
    vector_names: List[str], list of vector names

    """

    expression: str
    variable_names: str
    vector_names: str


class VectorExpressionInfo2(BaseModel):
    """

    `Description`:
    Dictionary with all required items for an expression
    `Required keys`:

    expression: str, mathematical expression
    variable_names: List[str], list of variable names
    vector_names: List[str], list of vector names

    """

    expression: str
    variable_names: str
    vector_names: str
