from pydantic import BaseModel


class GraphUserPhoto(BaseModel):
    avatar_b64str: str | None = None


class GraphUser(BaseModel):
    id: str
    principal_name: str
    display_name: str
    email: str
