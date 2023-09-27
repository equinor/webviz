from typing import List

from src.services.sumo_access.seismic_types import SeismicMeta
from . import schemas


def to_api_seismic_directory(seismic_metas: List[SeismicMeta]) -> List[schemas.SeismicMeta]:
    return [schemas.SeismicMeta(**meta.__dict__) for meta in seismic_metas]
