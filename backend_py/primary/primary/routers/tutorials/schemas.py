from typing import List

from pydantic import BaseModel


class SignedTutorialMediaRequest(BaseModel):
    slugs: List[str]


class TutorialMediaUrls(BaseModel):
    slug: str
    thumbnailUrl: str
    videoUrl: str
    stepsUrl: str
