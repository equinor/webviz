from dataclasses import dataclass
from typing import List
from enum import StrEnum
from pydantic import BaseModel


######################################################################################################
#
# This file contains the response types for the vds-slice service found in the following file:
#
# https://github.com/equinor/vds-slice/blob/master/internal/core/core.go
#
# Master commit hash: ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3
#
# https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go
#
######################################################################################################
class VdsDirection(StrEnum):
    """
    Direction options for vds slice

    https://github.com/equinor/oneseismic-api/blob/1d44cbeafe298219bfc0814c82ca57de817982c6/internal/core/direction.cpp#L16
    """

    I = "I"
    J = "J"
    K = "K"
    INLINE = "Inline"
    CROSSLINE = "Crossline"
    DEPTH = "Depth"
    TIME = "Time"
    SAMPLE = "Sample"


@dataclass
class VdsArray:
    """
    Definition of a response array from vds-slice

    format: A data format is represented by numpy-style formatcodes.
    shape: Shape of an array, e.g. [10,50] for a 2D array with 10 rows and 50 columns.



    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L96-L103
    """

    format: str
    shape: List[int]

class VdsAxis(BaseModel):
    """
    Definition of an axis from vds-slice

class VdsAxis(BaseModel):
    """
    Definition of a fence metadata response from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L160-L162
    """
    x: VdsAxis
    y: VdsAxis
    geospatial: List[List[float]]
    # shape: List[int]

    annotation: VdsDirection
    max: float
    min: float
    samples: int
    unit: str


@dataclass
class VdsFenceMetadata(VdsArray):
    """
    Definition of a fence metadata response from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L160-L162
    """


@dataclass
class VdsSliceMetadata(VdsArray):
    """
    Definition of a slice metadata response from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L160-L162
    """

    x_axis: VdsAxis
    y_axis: VdsAxis
    geospatial: List[List[float]]


class VdsBoundingBox(BaseModel):
    """
    Definition of a bounding box from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L90-L94
    """

    cdp: List[List[float]]
    ij: List[List[float]]
    ilxl: List[List[float]]


class VdsMetadata(BaseModel):
    """
    Definition of metadata from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L140-L157
    """

    axis: List[VdsAxis]
    boundingBox: VdsBoundingBox
    crs: str
