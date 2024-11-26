from enum import StrEnum


class TreeType(StrEnum):
    GRUPTREE = "GRUPTREE"
    BRANPROP = "BRANPROP"


class NetworkModeOptions(StrEnum):
    STATISTICS = "statistics"
    SINGLE_REAL = "single_real"


class StatOptions(StrEnum):
    MEAN = "mean"
    P10 = "p10"
    P50 = "p50"
    P90 = "p90"
    MAX = "max"
    MIN = "min"


class DataType(StrEnum):
    WELL_STATUS = "well_status"
    OILRATE = "oilrate"
    GASRATE = "gasrate"
    WATERRATE = "waterrate"
    WATERINJRATE = "waterinjrate"
    GASINJRATE = "gasinjrate"
    PRESSURE = "pressure"
    BHP = "bhp"
    WMCTL = "wmctl"


class EdgeOrNode(StrEnum):
    EDGE = "edge"
    NODE = "node"
