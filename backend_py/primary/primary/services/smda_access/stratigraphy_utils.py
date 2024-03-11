import logging
from typing import List
from pydantic import BaseModel

from .types import StratigraphicUnit, StratigraphicSurface, StratigraphicFeature

LOGGER = logging.getLogger(__name__)


class HierarchicalStratigraphicUnit(BaseModel):
    """A stratigraphic unit within a hierarchical structure, i.e a multi-level stratigraphical column"""

    unit: StratigraphicUnit
    children: List["HierarchicalStratigraphicUnit"] = []


def create_hierarchical_structure(strat_units: List[StratigraphicUnit]) -> List[HierarchicalStratigraphicUnit]:
    """Create a hierarchical structure of stratigraphic units using strat_unit_parent.
    On Drogon this will result in the following structure:
    - VOLANTIS GP.
        - Valysar Fm.
        - Therys Fm.
        - Volon Fm
    """
    unit_by_id = {unit.identifier: HierarchicalStratigraphicUnit(unit=unit, children=[]) for unit in strat_units}
    roots = []

    for unit in strat_units:
        if unit.strat_unit_parent and unit.strat_unit_parent in unit_by_id:
            parent = unit_by_id[unit.strat_unit_parent]
            parent.children.append(unit_by_id[unit.identifier])
        else:
            roots.append(unit_by_id[unit.identifier])

    return roots


def flatten_hierarchical_structure(units: List[HierarchicalStratigraphicUnit]) -> List[StratigraphicUnit]:
    """Flattens the hierarchy of stratigraphic units to a list of stratigraphic units preserving the order."""
    flattened_list = []

    for hierarchical_unit in units:
        flattened_list.append(hierarchical_unit.unit)
        flattened_list.extend(flatten_hierarchical_structure(hierarchical_unit.children))

    return flattened_list


def flatten_hierarchical_structure_to_surface_name(
    units: List[HierarchicalStratigraphicUnit], idx: int = 0
) -> List[StratigraphicSurface]:
    """Flattens the hierarchy of stratigraphic units to a list of stratigraphic surfaces preserving the order.
    On Drogon this will result in the following list:
    - Volantis GP. Top
    - Volantis GP.
    - Valysar Fm. Top
    - Valysar Fm.
    - Therys Fm. Top
    - Therys Fm.
    - Volon Fm. Top
    - Volon Fm.
    - Volantis GP. Base
    """
    flattened_list = []

    for hierarchical_unit in units:
        unit = hierarchical_unit.unit
        LOGGER.info(f"Ordered stratigraphic top: {idx * ' '}{unit.top}")
        LOGGER.info(f"Ordered stratigraphic identifier: {idx * ' '}{unit.identifier}")
        flattened_list.append(
            StratigraphicSurface(
                name=unit.top,
                feature=StratigraphicFeature.HORIZON,
                strat_unit_parent=unit.strat_unit_parent,
                relative_strat_unit_level=idx,
                strat_unit_identifier=unit.identifier,
            )
        )
        flattened_list.append(
            StratigraphicSurface(
                name=unit.identifier,
                feature=StratigraphicFeature.ZONE,
                strat_unit_parent=unit.strat_unit_parent,
                relative_strat_unit_level=idx,
                strat_unit_identifier=unit.identifier,
            )
        )
        flattened_list.extend(flatten_hierarchical_structure_to_surface_name(hierarchical_unit.children, idx=idx + 1))
        flattened_list.append(
            StratigraphicSurface(
                name=unit.base,
                feature=StratigraphicFeature.HORIZON,
                strat_unit_parent=unit.strat_unit_parent,
                relative_strat_unit_level=idx,
                strat_unit_identifier=unit.identifier,
            )
        )
        LOGGER.info(f"Ordered stratigraphic base: {idx * ' '}{unit.base}")

    return flattened_list


def sort_stratigraphic_names_by_hierarchy(strat_units: List[StratigraphicUnit]) -> List[StratigraphicSurface]:
    """Get a flatten list of top/unit/base surface names in lithostratigraphical order"""
    hierarchical_units = create_hierarchical_structure(strat_units)
    sorted_surfaces = flatten_hierarchical_structure_to_surface_name(hierarchical_units)
    return sorted_surfaces


def sort_stratigraphic_units_by_hierarchy(strat_units: List[StratigraphicUnit]) -> List[StratigraphicUnit]:
    """Get stratigraphic units for stratigraphic column in lithostratigraphical order."""
    hierarchical_units = create_hierarchical_structure(strat_units)
    sorted_units = flatten_hierarchical_structure(hierarchical_units)
    return sorted_units
