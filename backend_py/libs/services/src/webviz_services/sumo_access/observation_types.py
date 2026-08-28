from typing import List, Optional

from pydantic import BaseModel


class SummaryVectorDateObservation(BaseModel):
    """A single observation of a summary vector at a specific date."""

    timestamp_utc_ms: int
    value: float
    error: float
    label: str


class SummaryVectorObservations(BaseModel):
    """A collection of observations of a summary vector."""

    vector_name: str
    observations: List[SummaryVectorDateObservation]


class RftObservation(BaseModel):
    """A specific RFT (Repeat Formation Tester) observation.

    Attributes:
        value (float): The measured observation value.
        error (float): The observation error in std.
        property (str): The property this observation represents, e.g. 'PRESSURE' or 'SWAT'.
        east (float): East utm coordinate of the observation.
        north (float): North utm coordinate of the observation.
        tvd (float): True vertical depth of the observation.
        md (Optional[float]): Measured depth along the well. Optional.
        zone (Optional[str]): The zone associated with the observation. Optional.
    """

    value: float
    error: float
    property: str
    east: float
    north: float
    tvd: float
    md: Optional[float] = None
    zone: Optional[str] = None


class RftObservations(BaseModel):
    """A collection of RFT (Repeat Formation Tester) observations for a specific well at a specific date.

    Attributes:
        well (str): Unique well identifier
        date (str): Observation date
        observations (List[RftObservation]): A list of RFT observations associated with this collection.
    """

    well: str
    date: str
    observations: List[RftObservation]
