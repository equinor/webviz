from typing import List

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsCategoryValues

from . import schemas


def api_category_filter_to_sumo_category_filter(
    categories: List[schemas.InplaceVolumetricsCategoryValues],
) -> List[InplaceVolumetricsCategoryValues]:
    """Converts the category filter from the API to the format expected by the sumo service"""
    return [InplaceVolumetricsCategoryValues(**category.model_dump()) for category in categories]