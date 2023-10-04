from typing import List
import xtgeo

from . import schemas


def to_api_polygons_data(xtgeo_poly: xtgeo.Polygons) -> List[schemas.PolygonData]:
    """
    Create API SurfaceData from xtgeo regular surface
    """
    polydata: List[schemas.PolygonData] = []
    for poly_id, polygon in xtgeo_poly.dataframe.groupby("POLY_ID"):
        polydata.append(
            schemas.PolygonData(
                x_arr=list(polygon.X_UTME),
                y_arr=list(polygon.Y_UTMN),
                z_arr=list(polygon.Z_TVDSS),
                poly_id=poly_id,
            )
        )
    return polydata
