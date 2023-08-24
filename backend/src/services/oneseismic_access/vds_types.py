from pydantic import BaseModel


class VdsHandle(BaseModel):
    sas_token: str
    vds_url: str
