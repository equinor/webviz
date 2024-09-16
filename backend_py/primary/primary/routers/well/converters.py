from primary.services.smda_access.types import WellboreHeader, WellboreTrajectory, WellborePick, StratigraphicUnit
from primary.services.ssdl_access.types import (
    WellboreCasing,
    WellboreCompletion,
    WellboreLogCurveHeader,
    WellborePerforation,
    WellboreLogCurveData,
)

from . import schemas


def convert_wellbore_pick_to_schema(wellbore_pick: WellborePick) -> schemas.WellborePick:
    return schemas.WellborePick(
        northing=wellbore_pick.northing,
        easting=wellbore_pick.easting,
        tvd=wellbore_pick.tvd,
        tvdMsl=wellbore_pick.tvd_msl,
        md=wellbore_pick.md,
        mdMsl=wellbore_pick.md_msl,
        uniqueWellboreIdentifier=wellbore_pick.unique_wellbore_identifier,
        pickIdentifier=wellbore_pick.pick_identifier,
        confidence=wellbore_pick.confidence,
        depthReferencePoint=wellbore_pick.depth_reference_point,
        mdUnit=wellbore_pick.md_unit,
    )


def convert_stratigraphic_unit_to_schema(
    stratigraphic_unit: StratigraphicUnit,
) -> schemas.StratigraphicUnit:
    return schemas.StratigraphicUnit(
        identifier=stratigraphic_unit.identifier,
        top=stratigraphic_unit.top,
        base=stratigraphic_unit.base,
        stratUnitLevel=stratigraphic_unit.strat_unit_level,
        stratUnitType=stratigraphic_unit.strat_unit_type,
        topAge=stratigraphic_unit.top_age,
        baseAge=stratigraphic_unit.base_age,
        stratUnitParent=stratigraphic_unit.strat_unit_parent,
        colorR=stratigraphic_unit.color_r,
        colorG=stratigraphic_unit.color_g,
        colorB=stratigraphic_unit.color_b,
        lithologyType=stratigraphic_unit.lithology_type,
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
        wellborePurpose=drilled_wellbore_header.wellbore_purpose,
        wellboreStatus=drilled_wellbore_header.wellbore_status,
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


def convert_wellbore_log_curve_header_to_schema(
    wellbore_log_curve_header: WellboreLogCurveHeader,
) -> schemas.WellboreLogCurveHeader:
    return schemas.WellboreLogCurveHeader(
        logName=wellbore_log_curve_header.log_name,
        curveName=wellbore_log_curve_header.curve_name,
        curveUnit=wellbore_log_curve_header.curve_unit,
    )


def convert_wellbore_log_curve_data_to_schema(
    wellbore_log_curve_data: WellboreLogCurveData,
) -> schemas.WellboreLogCurveData:
    return schemas.WellboreLogCurveData(
        indexMin=wellbore_log_curve_data.index_min,
        indexMax=wellbore_log_curve_data.index_max,
        minCurveValue=wellbore_log_curve_data.min_curve_value,
        maxCurveValue=wellbore_log_curve_data.max_curve_value,
        dataPoints=wellbore_log_curve_data.DataPoints,
        curveAlias=wellbore_log_curve_data.curve_alias,
        curveDescription=wellbore_log_curve_data.curve_description,
        indexUnit=wellbore_log_curve_data.index_unit,
        noDataValue=wellbore_log_curve_data.no_data_value,
    )
