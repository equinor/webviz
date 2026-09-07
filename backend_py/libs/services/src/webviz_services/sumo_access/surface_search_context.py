"""Helpers for building the Sumo search contexts used when locating surfaces."""

from typing import Sequence

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SumoClient, SearchContext

from webviz_services.service_exceptions import InvalidParameterError, Service

from .surface_types import STD_RES_SUB_NAME_FIELD, StdResAttribute, SurfaceAttribute, TagNameAttribute

# Suffix used by the surface metadata to mark an attribute as a standard result rather than a tagname.
LEGACY_STD_RES_ATTRIBUTE_SUFFIX = " (standard result)"


def make_realization_surface_search_context(
    sumo_client: SumoClient,
    case_uuid: str,
    ensemble_name: str,
    name: str,
    attribute: SurfaceAttribute,
    realization: int | Sequence[int] | bool,
    time_or_interval_str: str | None,
) -> SearchContext:
    """Build a search context for realization surfaces.

    Pass a single realization number to target one surface, or a sequence of realizations
    (or True for all) to target the source surfaces of a statistical calculation.
    """
    search_context = SearchContext(sumo_client).surfaces.filter(
        uuid=case_uuid,
        is_observation=False,
        aggregation=False,
        ensemble=ensemble_name,
        realization=realization,
        name=name,
        time=time_or_interval_str_to_sumo_time_filter(time_or_interval_str),
    )

    return apply_attribute_filter(search_context, attribute)


def make_observed_surface_search_context(
    sumo_client: SumoClient,
    case_uuid: str,
    name: str,
    attribute: SurfaceAttribute,
    time_or_interval_str: str,
) -> SearchContext:
    search_context = SearchContext(sumo_client).surfaces.filter(
        uuid=case_uuid,
        stage="case",
        is_observation=True,
        name=name,
        time=time_or_interval_str_to_sumo_time_filter(time_or_interval_str),
    )

    return apply_attribute_filter(search_context, attribute)


def apply_attribute_filter(search_context: SearchContext, attribute: SurfaceAttribute) -> SearchContext:
    if isinstance(attribute, TagNameAttribute):
        return _apply_tag_name_filter(search_context, attribute.tag_name)

    search_context = search_context.filter(standard_result=attribute.std_res_name.value)
    if attribute.sub_name is None:
        return search_context

    sub_name_field = STD_RES_SUB_NAME_FIELD.get(attribute.std_res_name)
    if sub_name_field is None:
        raise InvalidParameterError(
            f"Standard result {attribute.std_res_name.value} does not support a sub name", Service.SUMO
        )

    return search_context.filter(complex={"term": {sub_name_field: attribute.sub_name}})


def _apply_tag_name_filter(search_context: SearchContext, tag_name: str) -> SearchContext:
    # Surface metadata still reports standard results as "<name> (standard result)" in the attribute field,
    # so a tag name may actually be a standard result. Remove once the metadata exposes structured attributes.
    if tag_name.endswith(LEGACY_STD_RES_ATTRIBUTE_SUFFIX):
        return search_context.filter(standard_result=tag_name.removesuffix(LEGACY_STD_RES_ATTRIBUTE_SUFFIX))

    return search_context.filter(tagname=tag_name)


def attribute_to_log_str(attribute: SurfaceAttribute) -> str:
    if isinstance(attribute, StdResAttribute):
        return f"{attribute.std_res_name.value}/{attribute.sub_name}"

    return attribute.tag_name


def time_or_interval_str_to_sumo_time_filter(time_or_interval_str: str | None) -> TimeFilter:
    if time_or_interval_str is None:
        return TimeFilter(TimeType.NONE)

    timestamp_arr = time_or_interval_str.split("/")
    if len(timestamp_arr) not in (1, 2):
        raise ValueError("time_or_interval_str must contain a single timestamp or interval")

    if len(timestamp_arr) == 1:
        return TimeFilter(
            TimeType.TIMESTAMP,
            start=timestamp_arr[0],
            end=timestamp_arr[0],
            exact=True,
        )

    return TimeFilter(
        TimeType.INTERVAL,
        start=timestamp_arr[0],
        end=timestamp_arr[1],
        exact=True,
    )
