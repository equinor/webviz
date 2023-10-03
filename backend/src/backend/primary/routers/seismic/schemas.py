from pydantic import BaseModel

from src.services.vds_access.types import VdsAxis
from src.services.utils.b64 import B64FloatArray


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str


class SeismicIntersectionData(BaseModel):
    values_base64arr: B64FloatArray
    z_axis: VdsAxis
