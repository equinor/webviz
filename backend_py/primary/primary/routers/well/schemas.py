from typing import List, Optional
from pydantic import BaseModel


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
    wellboreUuid: str
    pickIdentifier: str
    confidence: Optional[str] = None
    depthReferencePoint: str
    mdUnit: str


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
    curveUnit: str | None


class WellboreLogCurveData(BaseModel):
    name: str
    indexMin: float
    indexMax: float
    minCurveValue: float
    maxCurveValue: float
    curveAlias: str | None
    curveDescription: str | None
    indexUnit: str
    noDataValue: float | None
    unit: str
    curveUnitDesc: str | None
    dataPoints: list[list[float | None]]
