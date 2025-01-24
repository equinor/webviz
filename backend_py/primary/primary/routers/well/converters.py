from typing import TypeVar, Optional

from primary.services.smda_access.types import (
    WellboreHeader,
    WellboreTrajectory,
    WellborePick,
    StratigraphicColumn,
    WellboreGeoHeader,
    WellboreGeoData,
    WellboreStratigraphicUnit,
)
from primary.services.ssdl_access.types import (
    WellboreCasing,
    WellboreCompletion,
    WellboreLogCurveHeader,
    WellborePerforation,
    WellboreLogCurveData,
)

from . import schemas
from . import utils


def convert_wellbore_pick_to_schema(wellbore_pick: WellborePick) -> schemas.WellborePick:
    return schemas.WellborePick(
        northing=wellbore_pick.northing,
        easting=wellbore_pick.easting,
        tvd=wellbore_pick.tvd,
        tvdMsl=wellbore_pick.tvd_msl,
        md=wellbore_pick.md,
        mdMsl=wellbore_pick.md_msl,
        uniqueWellboreIdentifier=wellbore_pick.unique_wellbore_identifier,
        wellboreUuid=wellbore_pick.wellbore_uuid,
        pickIdentifier=wellbore_pick.pick_identifier,
        confidence=wellbore_pick.confidence,
        depthReferencePoint=wellbore_pick.depth_reference_point,
        mdUnit=wellbore_pick.md_unit,
        interpreter=wellbore_pick.interpreter,
    )


def convert_wellbore_header_to_schema(
    drilled_wellbore_header: WellboreHeader,
) -> schemas.WellboreHeader:
    return schemas.WellboreHeader(
        wellboreUuid=drilled_wellbore_header.wellbore_uuid,
        uniqueWellboreIdentifier=drilled_wellbore_header.unique_wellbore_identifier,
        wellUuid=drilled_wellbore_header.well_uuid,
        uniqueWellIdentifier=drilled_wellbore_header.unique_well_identifier,
        wellEasting=drilled_wellbore_header.well_easting,
        wellNorthing=drilled_wellbore_header.well_northing,
        depthReferencePoint=drilled_wellbore_header.depth_reference_point,
        depthReferenceElevation=drilled_wellbore_header.depth_reference_elevation,
        wellborePurpose=(drilled_wellbore_header.wellbore_purpose if drilled_wellbore_header.wellbore_purpose else ""),
        wellboreStatus=drilled_wellbore_header.wellbore_status if drilled_wellbore_header.wellbore_status else "",
    )


def convert_well_trajectory_to_schema(
    well_trajectory: WellboreTrajectory,
) -> schemas.WellboreTrajectory:
    return schemas.WellboreTrajectory(
        wellboreUuid=well_trajectory.wellbore_uuid,
        uniqueWellboreIdentifier=well_trajectory.unique_wellbore_identifier,
        tvdMslArr=well_trajectory.tvd_msl_arr,
        mdArr=well_trajectory.md_arr,
        eastingArr=well_trajectory.easting_arr,
        northingArr=well_trajectory.northing_arr,
    )


def convert_wellbore_completion_to_schema(
    wellbore_completion: WellboreCompletion,
) -> schemas.WellboreCompletion:
    return schemas.WellboreCompletion(
        mdTop=wellbore_completion.md_top,
        mdBottom=wellbore_completion.md_bottom,
        tvdTop=wellbore_completion.tvd_top,
        tvdBottom=wellbore_completion.tvd_bottom,
        description=wellbore_completion.description,
        symbolName=wellbore_completion.symbol_name,
        comment=wellbore_completion.comment,
    )


def convert_wellbore_casing_to_schema(
    wellbore_casing: WellboreCasing,
) -> schemas.WellboreCasing:
    return schemas.WellboreCasing(
        itemType=wellbore_casing.item_type,
        diameterNumeric=wellbore_casing.diameter_numeric,
        diameterInner=wellbore_casing.diameter_inner,
        description=wellbore_casing.description,
        remark=wellbore_casing.remark,
        depthTopMd=wellbore_casing.depth_top_md,
        depthBottomMd=wellbore_casing.depth_bottom_md,
        totalDepthMd=wellbore_casing.total_depth_md,
        startDepth=wellbore_casing.start_depth,
        endDepth=wellbore_casing.end_depth,
    )


def convert_wellbore_perforation_to_schema(
    wellbore_perforation: WellborePerforation,
) -> schemas.WellborePerforation:
    return schemas.WellborePerforation(
        mdTop=wellbore_perforation.md_top,
        mdBottom=wellbore_perforation.md_bottom,
        tvdTop=wellbore_perforation.tvd_top,
        tvdBottom=wellbore_perforation.tvd_bottom,
        status=wellbore_perforation.status,
        completionMode=wellbore_perforation.completion_mode,
    )


# TODO: Evaluate if the current header structure is the most useful
# ? Should all these conversions happen within a dedicated service instead?
def convert_wellbore_log_curve_header_to_schema(curve_header: WellboreLogCurveHeader) -> schemas.WellboreLogCurveHeader:
    if curve_header.log_name is None:
        raise AttributeError("Missing log name is not allowed")

    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG,
        sourceId=f"{curve_header.log_name}::{curve_header.curve_name}",
        curveType=utils.curve_type_from_header(curve_header),
        logName=curve_header.log_name,
        curveName=curve_header.curve_name,
        curveUnit=curve_header.curve_unit,
    )


def convert_wellbore_geo_header_to_well_log_header(
    geo_header: WellboreGeoHeader,
) -> schemas.WellboreLogCurveHeader:
    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY,
        sourceId=f"{geo_header.identifier}::{geo_header.source}",
        curveType=utils.curve_type_from_header(geo_header),
        logName=geo_header.source,
        curveName=geo_header.identifier,
        curveUnit="UNITLESS",
    )


def convert_strat_column_to_well_log_header(column: StratigraphicColumn) -> schemas.WellboreLogCurveHeader:
    type_or_default = column.strat_column_type or "UNNAMED"

    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY,
        sourceId=f"{type_or_default}::{column.strat_column_identifier}",
        curveType=utils.curve_type_from_header(column),
        logName=column.strat_column_identifier,
        curveName=type_or_default,
        curveUnit="UNITLESS",
    )


def convert_wellbore_log_curve_data_to_schema(
    wellbore_log_curve_data: WellboreLogCurveData,
) -> schemas.WellboreLogCurveData:
    metadata_discrete = utils.get_discrete_metadata_for_well_log_curve(wellbore_log_curve_data)

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG,
        name=wellbore_log_curve_data.name,
        logName=wellbore_log_curve_data.log_name,
        unit=wellbore_log_curve_data.unit,
        curveUnitDesc=wellbore_log_curve_data.curve_unit_desc,
        indexMin=wellbore_log_curve_data.index_min,
        indexMax=wellbore_log_curve_data.index_max,
        minCurveValue=wellbore_log_curve_data.min_curve_value,
        maxCurveValue=wellbore_log_curve_data.max_curve_value,
        dataPoints=wellbore_log_curve_data.DataPoints,
        curveAlias=wellbore_log_curve_data.curve_alias,
        curveDescription=wellbore_log_curve_data.curve_description,
        indexUnit=wellbore_log_curve_data.index_unit,
        noDataValue=wellbore_log_curve_data.no_data_value,
        metadataDiscrete=metadata_discrete,
    )


def convert_geology_data_to_log_curve_schema(
    geo_header: WellboreGeoHeader,
    geo_data_entries: list[WellboreGeoData],
) -> schemas.WellboreLogCurveData:
    """Reduces a set of geo data entries and a geo data header into a combined well-log curve"""

    if len(geo_data_entries) < 1:
        raise ValueError("Expected at least one entry in geology data list")

    index_min = float("inf")
    index_max = float("-inf")

    data_points: list[tuple[float, float | str | None]] = []
    metadata_discrete: schemas.DiscreteMetaEntry = {}  # type: ignore[assignment]

    for idx, geo_data in enumerate(geo_data_entries):
        index_min = min(index_min, geo_data.top_depth_md)
        index_max = max(index_max, geo_data.base_depth_md)

        next_geo_data = __safe_index_get(idx + 1, geo_data_entries)

        data_points.append((geo_data.top_depth_md, geo_data.code))

        # If the curve is without any gaps, the top of the next pick will be the same as this picks base. Only add a "none" value if the curve reaches a gap
        if next_geo_data is None or next_geo_data.top_depth_md != geo_data.base_depth_md:
            data_points.append((geo_data.base_depth_md, None))

        # Set up discrete meta-data colors and strings
        # ? This piece of code generates a structure thats very Subsurface-Comp library specific...
        # ? Should we opt for a more generic approach here, and have some transformation logic on the frontend?
        color = (geo_data.color_r, geo_data.color_g, geo_data.color_b)
        metadata_discrete.update({geo_data.identifier: (geo_data.code, color)})

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY,
        curveDescription="Generated - Derived from geology data entries",
        name=geo_header.identifier,
        logName=geo_header.source,
        indexMin=geo_header.md_min,
        indexMax=geo_header.md_max,
        unit="UNITLESS",
        indexUnit=geo_header.md_unit,
        dataPoints=data_points,
        metadataDiscrete=metadata_discrete,
        # These fields can't be derived in a meaningful way. Luckily, they shouldnt be needed for discrete curves anyways, soooooo
        minCurveValue=0,
        maxCurveValue=0,
        noDataValue=None,
        curveAlias=None,
        curveUnitDesc=None,
    )


def convert_strat_unit_data_to_log_curve_schema(
    strat_units: list[WellboreStratigraphicUnit],
) -> schemas.WellboreLogCurveData:
    if len(strat_units) < 1:
        raise ValueError("Expected at least one entry in strat-unit list")

    index_min = float("inf")
    index_max = float("-inf")

    data_points: list[tuple[float, float | str | None]] = []
    metadata_discrete: schemas.DiscreteMetaEntry = {}  # type: ignore[assignment]

    # The list of units has entries at different unit-levels, meaning some entries might be "inside" a different entry. Storing "parents" here to access them in later iterations
    parent_units: list[WellboreStratigraphicUnit] = []

    for idx, current_unit in enumerate(strat_units):
        index_min = min(index_min, current_unit.entry_md)
        index_max = max(index_max, current_unit.exit_md)

        next_unit = __safe_index_get(idx + 1, strat_units)

        unit_ident = current_unit.strat_unit_identifier
        code = __get_code_for_string_data(unit_ident, metadata_discrete)
        colors = (current_unit.color_r, current_unit.color_g, current_unit.color_b)

        metadata_discrete.update({unit_ident: (code, colors)})

        # The previous pick might have exited where this one start. If so, remove the "exit" datapoint
        if data_points and data_points[-1][0] == current_unit.entry_md:
            data_points.pop()

        data_points.append((current_unit.entry_md, code))
        # data_points.append([current_unit.exit_md, code])

        if not next_unit:
            # End of curve. Add a "None" entry to make it explicit.
            # TODO: For the future; if the subsurface component is updated to respect min-max values, the final "None" value shouldnt be needed

            # Get the exit_md furthest down the curve
            last_exit = current_unit.exit_md
            while parent_units:
                parent = parent_units.pop()
                last_exit = max(last_exit, parent.exit_md)

            data_points.append((last_exit, None))
            break

        if current_unit.exit_md < next_unit.entry_md:
            # This section isnt directly connected to the next, so the curve should return to the parent's value here
            exit_unit = __get_strat_unit_at_exit(current_unit, parent_units)
            exit_value = None

            if exit_unit:
                exit_value = __get_code_for_string_data(exit_unit.strat_unit_identifier, metadata_discrete)

            data_points.append((current_unit.exit_md, exit_value))

        if current_unit.strat_unit_level < next_unit.strat_unit_level:
            parent_units.append(current_unit)

        elif current_unit.strat_unit_level > next_unit.strat_unit_level and parent_units:
            parent_units.pop()

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY,
        curveDescription="COMPUTED - Derived from stratigraphy unit entries",
        name=strat_units[0].strat_column_type or "UNNAMED",
        logName=strat_units[0].strat_column_identifier,
        indexMin=index_min,
        indexMax=index_max,
        unit="UNITLESS",
        indexUnit="m",
        dataPoints=data_points,
        metadataDiscrete=metadata_discrete,
        # These fields can't be derived in a meaningful way. Luckily, they shouldnt be needed for discrete curves in the WellLogViewer anyways, soooooo
        minCurveValue=0,
        maxCurveValue=0,
        noDataValue=None,
        curveAlias=None,
        curveUnitDesc=None,
    )


Tdata = TypeVar("Tdata")


# ? Should we make this a global utility? Might be useful for other people
def __safe_index_get(index: int, arr: list[Tdata], default: Optional[Tdata] = None) -> Optional[Tdata]:
    """Gets an item from a list, or returns default if index is out of range"""

    try:
        return arr[index]
    except IndexError:
        return default


def __get_code_for_string_data(value: str, discrete_meta: schemas.DiscreteMetaEntry) -> int:
    if value in discrete_meta.keys():
        return discrete_meta[value][0]

    return len(discrete_meta.keys()) + 1


def __get_strat_unit_at_exit(
    unit: WellboreStratigraphicUnit,
    parent_units: list[WellboreStratigraphicUnit],
) -> WellboreStratigraphicUnit | None:
    for parent in parent_units:
        if parent.exit_md > unit.exit_md:
            return parent

    return None
