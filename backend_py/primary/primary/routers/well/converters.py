from primary.utils.arrays import safe_index_get
from primary.services.smda_access.types import (
    WellboreHeader,
    WellboreTrajectory,
    WellborePick,
    StratigraphicColumn,
    WellboreGeoHeader,
    WellboreGeoData,
    WellboreStratigraphicUnit,
    WellboreSurveyHeader,
    WellboreSurveySample,
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


def to_api_stratigraphic_column(column: StratigraphicColumn) -> schemas.StratigraphicColumn:
    return schemas.StratigraphicColumn(
        identifier=column.strat_column_identifier,
        areaType=column.strat_column_area_type,
        status=column.strat_column_status,
        type=column.strat_column_type,
    )


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
        obsNo=wellbore_pick.obs_no,
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


# ? Should all these conversions happen within a dedicated service instead?
def convert_wellbore_log_curve_header_to_schema(curve_header: WellboreLogCurveHeader) -> schemas.WellboreLogCurveHeader:
    if curve_header.log_name is None:
        raise AttributeError("Missing log name is not allowed")

    # Replace the "UNITLESS" string to simplify frontend checks
    curve_unit = None
    if curve_header.curve_unit and str.upper(curve_header.curve_unit) != "UNITLESS":
        curve_unit = curve_header.curve_unit

    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG,
        curveType=utils.curve_type_from_header(curve_header),
        logName=curve_header.log_name,
        curveName=curve_header.curve_name,
        curveUnit=curve_unit,
    )


def convert_wellbore_geo_header_to_well_log_header(
    geo_header: WellboreGeoHeader,
) -> schemas.WellboreLogCurveHeader:
    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY,
        curveType=utils.curve_type_from_header(geo_header),
        logName=geo_header.interpreter,
        curveName=geo_header.identifier,
        curveUnit=None,
    )


def convert_strat_column_to_well_log_header(column: StratigraphicColumn) -> schemas.WellboreLogCurveHeader:
    type_or_default = column.strat_column_type or "UNNAMED"

    return schemas.WellboreLogCurveHeader(
        source=schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY,
        curveType=utils.curve_type_from_header(column),
        logName=column.strat_column_identifier,
        curveName=type_or_default,
        curveUnit=None,
    )


# ! Splits a single survey into distinct curves for Azimuth, dogleg, and inclination
def convert_survey_header_to_well_log_headers(
    survey_header: WellboreSurveyHeader,
) -> list[schemas.WellboreLogCurveHeader]:
    def make_curve(name: str, unit: str) -> schemas.WellboreLogCurveHeader:
        return schemas.WellboreLogCurveHeader(
            curveName=name,
            curveUnit=unit,
            ### Shared settings
            # Only expected to have a single survey, so name is static
            logName="Wellbore Survey",
            curveType=schemas.WellLogCurveTypeEnum.CONTINUOUS,
            source=schemas.WellLogCurveSourceEnum.SMDA_SURVEY,
        )

    return [
        # It's assumed that all surveys have these 3
        make_curve("AZI", survey_header.azimuth_unit),
        make_curve("INCL", survey_header.inclination_unit),
        make_curve("DLS", survey_header.dogleg_severity_unit),
    ]


def convert_wellbore_log_curve_data_to_schema(
    wellbore_log_curve_data: WellboreLogCurveData,
) -> schemas.WellboreLogCurveData:
    discrete_value_meta = utils.build_discrete_value_meta_for_ssdl_curve(wellbore_log_curve_data)

    # Replace the "UNITLESS" string to simplify frontend checks
    curve_unit = None
    if wellbore_log_curve_data.unit and str.upper(wellbore_log_curve_data.unit) != "UNITLESS":
        curve_unit = wellbore_log_curve_data.unit

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG,
        name=wellbore_log_curve_data.name,
        logName=wellbore_log_curve_data.log_name,
        unit=curve_unit,
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
        discreteValueMetadata=discrete_value_meta,
    )


def convert_geology_data_to_log_curve_schema(
    geo_header: WellboreGeoHeader,
    geo_data_entries: list[WellboreGeoData],
) -> schemas.WellboreLogCurveData:
    """Reduces a set of geo data entries and a geo data header into a combined well-log curve"""

    if len(geo_data_entries) < 1:
        raise ValueError("Expected at least one entry in geology data list")

    discrete_value_metadata = utils.build_discrete_value_meta_for_geo_data(geo_data_entries)
    data_points: list[tuple[float, float | str | None]] = []

    for idx, geo_data in enumerate(geo_data_entries):
        next_geo_data = safe_index_get(idx + 1, geo_data_entries)

        data_points.append((geo_data.top_depth_md, geo_data.code))

        # If the curve is without any gaps, the top of the next pick will be the same as this picks base. Only add a "none" value if the curve reaches a gap
        if next_geo_data is None or next_geo_data.top_depth_md != geo_data.base_depth_md:
            data_points.append((geo_data.base_depth_md, None))

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY,
        curveDescription="Generated - Derived from geology data entries",
        name=geo_header.identifier,
        logName=geo_header.source,
        indexMin=geo_header.md_min,
        indexMax=geo_header.md_max,
        indexUnit=geo_header.md_unit,
        dataPoints=data_points,
        discreteValueMetadata=discrete_value_metadata,
        # These fields can't be derived in a meaningful way. Luckily, they shouldn't be needed for discrete curves anyways
        unit=None,
        minCurveValue=None,
        maxCurveValue=None,
        noDataValue=None,
        curveAlias=None,
        curveUnitDesc=None,
    )


def convert_strat_unit_data_to_log_curve_schema(
    strat_units: list[WellboreStratigraphicUnit],
) -> schemas.WellboreLogCurveData:
    if len(strat_units) < 1:
        raise ValueError("Expected at least one entry in strat-unit list")

    ident_to_code_map = _build_strat_unit_ident_to_code_map(strat_units)
    discrete_metadata = utils.build_discrete_value_meta_for_strat_data_and_codes(strat_units, ident_to_code_map)

    index_min = float("inf")
    index_max = float("-inf")

    data_points: list[tuple[float, float | str | None]] = []

    # The list of units has entries at different unit-levels, meaning some entries might be "inside" a different entry. Storing "parents" here to access them in later iterations
    parent_units: list[WellboreStratigraphicUnit] = []

    for idx, current_unit in enumerate(strat_units):
        index_min = min(index_min, current_unit.entry_md)
        index_max = max(index_max, current_unit.exit_md)

        next_unit = safe_index_get(idx + 1, strat_units)

        unit_ident = current_unit.strat_unit_identifier
        discrete_code = ident_to_code_map[unit_ident]

        # The previous pick might have exited where this one start. If so, remove the "exit" datapoint
        if data_points and data_points[-1][0] == current_unit.entry_md:
            data_points.pop()

        data_points.append((current_unit.entry_md, discrete_code))

        if not next_unit:
            # End of curve. Add a "None" entry to make it explicit.
            # ! For future refference; if the subsurface component is updated to respect min-max values, this "None" value shouldnt be needed

            # Get the exit_md furthest down the curve
            last_exit = current_unit.exit_md
            while parent_units:
                parent = parent_units.pop()
                last_exit = max(last_exit, parent.exit_md)

            data_points.append((last_exit, None))
            break

        if current_unit.exit_md < next_unit.entry_md:
            # This section isn't directly connected to the next, so the curve should return to the parent's value here
            exit_unit = _get_strat_unit_at_exit(current_unit, parent_units)
            exit_value = ident_to_code_map[exit_unit.strat_unit_identifier] if exit_unit else None

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
        indexUnit="m",
        dataPoints=data_points,
        discreteValueMetadata=discrete_metadata,
        # These fields can't be derived in a meaningful way. Luckily, they shouldn't be needed for discrete curves in the WellLogViewer anyways, soooooo
        unit=None,
        minCurveValue=None,
        maxCurveValue=None,
        noDataValue=None,
        curveAlias=None,
        curveUnitDesc=None,
    )


def _build_strat_unit_ident_to_code_map(strat_units: list[WellboreStratigraphicUnit]) -> dict[str, int]:
    ident_to_code_map: dict[str, int] = {}

    for unit in strat_units:
        if unit.strat_unit_identifier not in ident_to_code_map:
            ident_to_code_map.update({unit.strat_unit_identifier: len(ident_to_code_map.keys())})

    return ident_to_code_map


def _get_strat_unit_at_exit(
    unit: WellboreStratigraphicUnit,
    parent_units: list[WellboreStratigraphicUnit],
) -> WellboreStratigraphicUnit | None:
    for parent in parent_units:
        if parent.exit_md > unit.exit_md:
            return parent

    return None


def convert_survey_sample_to_log_curve_schemas(
    survey_samples: list[WellboreSurveySample],
    survey_header: WellboreSurveyHeader,
    curve_name: str,
) -> schemas.WellboreLogCurveData:
    (full_name, unit, curve_min, curve_max) = _get_curve_specific_header_values(curve_name, survey_header)

    curve_index_min = float("inf")
    curve_index_max = float("-inf")
    data_points: list[tuple[float, float | str | None]] = []

    for sample in survey_samples:
        curve_index_min = sample.md if sample.md < curve_index_min else curve_index_min
        curve_index_max = sample.md if sample.md > curve_index_max else curve_index_max
        data_points.append((sample.md, _get_sample_data_point_for_curve(curve_name, sample)))

    return schemas.WellboreLogCurveData(
        source=schemas.WellLogCurveSourceEnum.SMDA_SURVEY,
        curveDescription=f"{full_name} (COMPUTED - Derived from SMDA survey sample entries)",
        name=curve_name,
        curveAlias=full_name,
        unit=unit,
        # Only expected to have a single survey, so name is static
        logName="Wellbore Survey",
        minCurveValue=curve_min,
        maxCurveValue=curve_max,
        indexMin=curve_index_min,
        indexMax=curve_index_max,
        indexUnit="m",
        noDataValue=None,
        curveUnitDesc=None,
        dataPoints=data_points,
        discreteValueMetadata=None,
    )


def _get_curve_specific_header_values(
    curve_name: str, survey_header: WellboreSurveyHeader
) -> tuple[str, str, float, float]:
    if curve_name == "AZI":
        return ("Azimuth", survey_header.azimuth_unit, 0, 360)
    if curve_name == "INCL":
        return ("Inclination", survey_header.inclination_unit, 0, 120)
    if curve_name == "DLS":
        return ("Dogleg severity", survey_header.dogleg_severity_unit, 0, 6)

    raise ValueError(f"Unrecognized survey geometry curve name, {curve_name}")


def _get_sample_data_point_for_curve(curve_name: str, survey_sample: WellboreSurveySample) -> float:
    if curve_name == "AZI":
        return survey_sample.azimuth
    if curve_name == "INCL":
        return survey_sample.inclination
    if curve_name == "DLS":
        return survey_sample.dogleg_severity

    raise ValueError(f"Unrecognized survey geometry curve name, {curve_name}")
