from typing import List, Optional
from pydantic import BaseModel


class StratigraphicUnit(BaseModel):
    """
    Stratigraphic unit from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    identifier: str
    top: str
    base: str
    stratUnitLevel: int
    stratUnitType: str
    topAge: int | float
    baseAge: int | float
    stratUnitParent: Optional[str] = None
    colorR: int
    colorG: int
    colorB: int
    lithologyType: int | float | str = "unknown"


class WellboreHeader(BaseModel):
    wellboreUuid: str
    uniqueWellboreIdentifier: str
    wellUuid: str
    uniqueWellIdentifier: str
    wellEasting: float
    wellNorthing: float
    depthReferencePoint: str
    depthReferenceElevation: float
    wellborePurpose: str
    wellboreStatus: str

class WellboreTrajectory(BaseModel):
    wellboreUuid: str
    uniqueWellboreIdentifier: str
    tvdMslArr: List[float]
    mdArr: List[float]
    eastingArr: List[float]
    northingArr: List[float]


class WellborePick(BaseModel):
    """
    Wellbore pick from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    northing: float
    easting: float
    tvd: float
    tvdMsl: float
    md: float
    mdMsl: float
    uniqueWellboreIdentifier: str
    pickIdentifier: str
    confidence: Optional[str] = None
    depthReferencePoint: str
    mdUnit: str


class WellborePicksAndStratigraphicUnits(BaseModel):
    wellbore_picks: List[WellborePick] = []
    stratigraphic_units: List[StratigraphicUnit] = []


class WellboreCompletion(BaseModel):
    mdTop: float
    mdBottom: float
    tvdTop: float | None
    tvdBottom: float | None
    description: str | None
    symbolName: str | None
    comment: str | None


class WellboreCasing(BaseModel):
    itemType: str  # Casing type
    diameterNumeric: float
    diameterInner: float
    description: str | None = None
    remark: str | None = None
    depthTopMd: float
    depthBottomMd: float
    totalDepthMd: float
    startDepth: float
    endDepth: float


class WellborePerforation(BaseModel):
    mdTop: float
    mdBottom: float
    tvdTop: float
    tvdBottom: float
    status: str
    completionMode: str


class WellboreLogCurveHeader(BaseModel):
    logName: str
    curveName: str
    curveUnit: str


class WellboreLogCurveData(BaseModel):
    indexMin: float
    indexMax: float
    minCurveValue: float
    maxCurveValue: float
    dataPoints: list[list[float | None]]
    curveAlias: str
    curveDescription: str
    indexUnit: str
    noDataValue: float
