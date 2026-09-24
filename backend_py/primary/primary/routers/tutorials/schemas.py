from pydantic import BaseModel


class TutorialMediaSasToken(BaseModel):
    sasToken: str
