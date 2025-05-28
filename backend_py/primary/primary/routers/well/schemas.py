from enum import Enum
from typing import List, Optional, TypeAlias
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


class StratigraphicColumn(BaseModel):
    """
    Stratigraphic column from SMDA
    """

    identifier: str
    areaType: str
    status: str
    type: str | None


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
    interpreter: str | None
    obsNo: int


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


class WellLogCurveSourceEnum(Enum):
    SSDL_WELL_LOG = "ssdl.well_log"
    SMDA_GEOLOGY = "smda.geology"
    SMDA_STRATIGRAPHY = "smda.stratigraphy"
    SMDA_SURVEY = "smda.survey"


class WellLogCurveTypeEnum(str, Enum):
    CONTINUOUS = "continuous"
    DISCRETE = "discrete"
    FLAG = "flag"


class WellboreLogCurveHeader(BaseModel):
    source: WellLogCurveSourceEnum
    curveType: WellLogCurveTypeEnum

    logName: str
    curveName: str
    curveUnit: str | None


RgbArray: TypeAlias = tuple[int, int, int]


class DiscreteValueMetadata(BaseModel):
    """
    Holds information that describes how a discrete curve value should be presented to the user.
    """

    code: int
    identifier: str
    rgbColor: RgbArray


class WellboreLogCurveData(BaseModel):
    source: WellLogCurveSourceEnum
    name: str
    logName: str
    indexMin: float
    indexMax: float
    minCurveValue: float | None
    maxCurveValue: float | None
    curveAlias: str | None
    curveDescription: str | None
    indexUnit: str
    noDataValue: float | None
    unit: str | None
    curveUnitDesc: str | None
    dataPoints: list[tuple[float, float | str | None]]
    discreteValueMetadata: list[DiscreteValueMetadata] | None
