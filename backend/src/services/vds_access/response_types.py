from dataclasses import dataclass
from typing import List

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


@dataclass
class VdsFenceMetadata(VdsArray):
    """
    Definition of a fence metadata response from vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L160-L162
    """


class VdsAxis(BaseModel):
    """
    Definition of an axis from vds-slice

    Neglected:
    - stepsize: float

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
    """

    annotation: str
    max: float
    min: float
    samples: int
    unit: str


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
