from pydantic import BaseModel


class SurfaceMeshAndProperty(BaseModel):
    x_ori: float
    y_ori: float
    x_count: int
    y_count: int
    x_inc: float
    y_inc: float
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    mesh_value_min: float
    mesh_value_max: float
    property_value_min: float
    property_value_max: float
    rot_deg: float
    mesh_data: str
    property_data: str
