from dataclasses import dataclass
from enum import StrEnum
from typing import List

######################################################################################################
#
# This file contains the request types for the vds-slice service found in the following file:
#
# https://github.com/equinor/vds-slice/blob/master/api/request.go
#
# Master commit hash: ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3
#
# https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go
#
######################################################################################################


class VdsInterpolation(StrEnum):
    """
    Interpolation options for vds fence

    Source: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L98
    """

    NEAREST = "nearest"
    LINEAR = "linear"
    CUBIC = "cubic"
    ANGULAR = "angular"
    TRIANGULAR = "triangular"


class VdsCoordinateSystem(StrEnum):
    """
    Coordinate system options for vds fence

    * ilxl: inline, crossline pairs
    * ij: Coordinates are given as in 0-indexed system, where the first
          line in each direction is 0 and the last is number-of-lines - 1.
    * cdp: Coordinates are given as cdpx/cdpy pairs. In the original SEGY
           this would correspond to the cdpx and cdpy fields in the
           trace-headers after applying the scaling factor.

    Source: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L86C3-L86C3
    """

    CDP = "cdp"
    IJ = "ij"
    ILXL = "ilxl"


@dataclass
class VdsCoordinates:
    """
    A list of coordinates in the selected VdsCoordinateSystem, as (x, y) points.

    Convert coordinates to format for query request parameter - [[x1,y1], [x2,y2], ..., [xn,yn]]

    Source: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L90
    """

    x_points: List[float]
    y_points: List[float]

    def __init__(self, x_points: List[float], y_points: List[float]) -> None:
        if len(x_points) != len(y_points):
            raise ValueError("x_points and y_points must be of equal length")

        self.x_points = x_points
        self.y_points = y_points

    def to_list(self) -> List[List[float]]:
        return [[x, y] for x, y in zip(self.x_points, self.y_points)]


@dataclass
class VdsRequestedResource:
    """
    Definition of requested vds resource for vds-slice
    This is a base class for request types for vds-slice requests

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L13-L35
    """

    vds: str  # blob url
    sas: str  # sas-token

    def request_parameters(self) -> dict:
        return {"vds": self.vds, "sas": self.sas}


@dataclass
class VdsMetadataRequest(VdsRequestedResource):
    """
    Definition of metadata request for vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L62-L64
    """


@dataclass
class VdsFenceRequest(VdsRequestedResource):
    """
    Definition of a fence request struct for vds-slice

    See: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/api/request.go#L76-L105
    """

    coordinate_system: VdsCoordinateSystem
    coordinates: VdsCoordinates
    interpolation: VdsInterpolation
    fill_value: float

    def request_parameters(self) -> dict:
        return {
            "vds": self.vds,
            "sas": self.sas,
            "coordinateSystem": self.coordinate_system.value,
            "coordinates": self.coordinates.to_list(),
            "interpolation": self.interpolation.value,
            "fillValue": self.fill_value,
        }
