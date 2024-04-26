"""Module containg class for a 3D grid geometry"""

from typing import Dict
from fmu.sumo.explorer.objects._child import Child


class Grid3dGeometry(Child):
    """Class representing a 3D grid geometry in Sumo"""

    @property
    def bbox(self) -> Dict:
        """Grid bbox data"""
        return self._get_property(["data", "bbox"])

    @property
    def spec(self) -> Dict:
        """Grid geometry spec data"""
        return self._get_property(["data", "spec"])
