from typing import List, Optional
from enum import Enum

from pydantic import BaseModel


class ObservationType(str, Enum):
    """The observation file in Sumo is a dictionary with these datatypes as keys."""

    SUMMARY = "smry"
    RFT = "rft"


class SummaryVectorDateObservation(BaseModel):
    """A single observation of a summary vector at a specific date."""

    date: str
    comment: Optional[str] = None
    value: float
    error: float
    label: str


class SummaryVectorObservations(BaseModel):
    """A collection of observations of a summary vector."""

    vector_name: str
    comment: Optional[str] = None
    observations: List[SummaryVectorDateObservation]


class RftObservation(BaseModel):
    """A specific RFT (Repeat Formation Tester) observation.

    Attributes:
        value (float): The measured value of the observation.
        comment (Optional[str]): An optional comment associated with the observation.
        error (float): The measurement error associated with the observation.
        zone (str): The zone or region associated with the observation.
        md_msl (float): Measured depth from mean sea level.
        x (float): X utm coordinate of the observation.
        y (float): Y utm coordinate of the observation.
        z (float): Z utm coordinate of the observation.
    """

    value: float
    comment: Optional[str] = None
    error: float
    zone: str
    md_msl: float
    x: float
    y: float
    z: float


class RftObservations(BaseModel):
    """A collection of RFT (Repeat Formation Tester) observations for a specific well at a specific date.

    Attributes:
        well (str): Unique well identifier
        date (str): Observation date
        comment (Optional[str]): An optional comment associated with the collection of observations.
        observations (List[RftObservation]): A list of RFT observations associated with this collection.
    """

    well: str
    date: str
    comment: Optional[str] = None
    observations: List[RftObservation]


class Observations(BaseModel):
    """A collection of observations associated with a field/case/ensemble"""

    summary: List[SummaryVectorObservations] = []
    rft: List[RftObservations] = []
