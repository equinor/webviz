from enum import StrEnum


class TreeType(StrEnum):
    GRUPTREE = "GRUPTREE"
    BRANPROP = "BRANPROP"


class StatOptions(StrEnum):
    MEAN = "mean"
    P10 = "p10"
    P50 = "p50"
    P90 = "p90"
    MAX = "max"
    MIN = "min"
