"""Module containg class for a 3D grid property"""

from typing import Dict
from fmu.sumo.explorer.objects._child import Child


class Grid3dProperty(Child):
    """Class representing a 3D grid property in Sumo"""

    @property
    def bbox(self) -> Dict:
        """Grid property bbox data"""
        return self._get_property(["data", "bbox"])

    @property
    def spec(self) -> Dict:
        """Grid property spec data"""
        return self._get_property(["data", "spec"])

    @property
    def timestamp(self) -> str:
        """Grid property timestamp data"""
        t0 = self._get_property(["data", "time", "t0", "value"])
        t1 = self._get_property(["data", "time", "t1", "value"])

        if t0 is not None and t1 is None:
            return t0

        return None

    @property
    def interval(self) -> str:
        """Grid property interval data"""
        t0 = self._get_property(["data", "time", "t0", "value"])
        t1 = self._get_property(["data", "time", "t1", "value"])

        if t0 is not None and t1 is not None:
            return (t0, t1)

        return None
