from enum import Enum
from typing import List, Optional, NewType
from pydantic import BaseModel


class StratigraphicColumn(BaseModel):
    """
    Stratigraphic column from SMDA
    """

    stratColumnIdentifier: str
    stratColumnAreaType: str
    stratColumnStatus: str
    stratColumnType: str | None


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
    wellboreUuid: str
    pickIdentifier: str
    confidence: Optional[str] = None
    depthReferencePoint: str
    mdUnit: str
    interpreter: str | None


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


class WellLogCurveSourceEnum(str, Enum):
    SSDL_WELL_LOG = "ssdl::well_log"
    SMDA_GEOLOGY = "smda::geology"
    SMDA_STRATIGRAPHY = "smda::stratigraphy"


class WellLogCurveTypeEnum(str, Enum):
    CONTINUOUS = "continuous"
    DISCRETE = "discrete"
    FLAG = "flag"


class WellboreLogCurveHeader(BaseModel):
    source: WellLogCurveSourceEnum
    sourceId: str
    curveType: WellLogCurveTypeEnum

    logName: str
    curveName: str
    curveUnit: str | None


DiscreteMetaEntry = NewType("DiscreteMetaEntry", dict[str, tuple[int, tuple[int, int, int]]])


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
    unit: str
    curveUnitDesc: str | None
    dataPoints: list[tuple[float, float | str | None]]
    # ? Field is very specific for the well-log-viewer module, should we instead create a "standards" service to get curve styles and others like this?
    metadataDiscrete: Optional[DiscreteMetaEntry] = None


# pylint: disable-next=missing-class-docstring
class WellboreGeoHeader(BaseModel):
    uuid: str
    identifier: str
    geolType: str
    mdRange: tuple[float, float]
    source: str


# pylint: disable-next=missing-class-docstring
class WellboreGeoData(BaseModel):
    uuid: str
    identifier: str
    geolType: str
    geolGroup: str
    code: int

    # ! I would like to use tuples, but OpenAPI turns them into a 'any[]' type
    # color: tuple[int, int, int]
    # mdRange: Tuple[float, float]
    color: List[int]
    mdRange: List[float]
