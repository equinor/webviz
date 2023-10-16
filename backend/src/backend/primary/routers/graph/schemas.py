from pydantic import BaseModel


class GraphUserPhoto(BaseModel):
    avatar_b64str: str | None = None
