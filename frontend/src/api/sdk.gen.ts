// This file is auto-generated by @hey-api/openapi-ts

import { createClient, createConfig, type OptionsLegacyParser } from '@hey-api/client-axios';
import type { GetFieldsError_api, GetFieldsResponse_api, GetCasesData_api, GetCasesError_api, GetCasesResponse_api, GetEnsemblesData_api, GetEnsemblesError_api, GetEnsemblesResponse_api, GetEnsembleDetailsData_api, GetEnsembleDetailsError_api, GetEnsembleDetailsResponse_api, GetVectorListData_api, GetVectorListError_api, GetVectorListResponse_api, GetRealizationsVectorDataData_api, GetRealizationsVectorDataError_api, GetRealizationsVectorDataResponse_api, GetTimestampsListData_api, GetTimestampsListError_api, GetTimestampsListResponse_api, GetHistoricalVectorDataData_api, GetHistoricalVectorDataError_api, GetHistoricalVectorDataResponse_api, GetStatisticalVectorDataData_api, GetStatisticalVectorDataError_api, GetStatisticalVectorDataResponse_api, GetStatisticalVectorDataPerSensitivityData_api, GetStatisticalVectorDataPerSensitivityError_api, GetStatisticalVectorDataPerSensitivityResponse_api, GetRealizationVectorAtTimestampData_api, GetRealizationVectorAtTimestampError_api, GetRealizationVectorAtTimestampResponse_api, GetTableDefinitionsData_api, GetTableDefinitionsError_api, GetTableDefinitionsResponse_api, PostGetAggregatedPerRealizationTableDataData_api, PostGetAggregatedPerRealizationTableDataError_api, PostGetAggregatedPerRealizationTableDataResponse_api, PostGetAggregatedStatisticalTableDataData_api, PostGetAggregatedStatisticalTableDataError_api, PostGetAggregatedStatisticalTableDataResponse_api, GetRealizationSurfacesMetadataData_api, GetRealizationSurfacesMetadataError_api, GetRealizationSurfacesMetadataResponse_api, GetObservedSurfacesMetadataData_api, GetObservedSurfacesMetadataError_api, GetObservedSurfacesMetadataResponse_api, GetSurfaceDataData_api, GetSurfaceDataError_api, GetSurfaceDataResponse_api, PostGetSurfaceIntersectionData_api, PostGetSurfaceIntersectionError_api, PostGetSurfaceIntersectionResponse_api, PostSampleSurfaceInPointsData_api, PostSampleSurfaceInPointsError_api, PostSampleSurfaceInPointsResponse_api, GetDeltaSurfaceDataData_api, GetDeltaSurfaceDataError_api, GetDeltaSurfaceDataResponse_api, GetMisfitSurfaceDataData_api, GetMisfitSurfaceDataError_api, GetMisfitSurfaceDataResponse_api, GetParameterNamesAndDescriptionData_api, GetParameterNamesAndDescriptionError_api, GetParameterNamesAndDescriptionResponse_api, GetParameterData_api, GetParameterError_api, GetParameterResponse_api, GetParametersData_api, GetParametersError_api, GetParametersResponse_api, IsSensitivityRunData_api, IsSensitivityRunError_api, IsSensitivityRunResponse_api, GetSensitivitiesData_api, GetSensitivitiesError_api, GetSensitivitiesResponse_api, GetGridModelsInfoData_api, GetGridModelsInfoError_api, GetGridModelsInfoResponse_api, IsGridGeometrySharedData_api, IsGridGeometrySharedError_api, IsGridGeometrySharedResponse_api, GridSurfaceData_api, GridSurfaceError_api, GridSurfaceResponse_api, GridParameterData_api, GridParameterError_api, GridParameterResponse_api, PostGetPolylineIntersectionData_api, PostGetPolylineIntersectionError_api, PostGetPolylineIntersectionResponse_api, GetRealizationGroupTreeDataData_api, GetRealizationGroupTreeDataError_api, GetRealizationGroupTreeDataResponse_api, TableDataData_api, TableDataError_api, TableDataResponse_api, RealizationsTablesAreEqualData_api, RealizationsTablesAreEqualError_api, RealizationsTablesAreEqualResponse_api, GetWellCompletionsDataData_api, GetWellCompletionsDataError_api, GetWellCompletionsDataResponse_api, GetDrilledWellboreHeadersData_api, GetDrilledWellboreHeadersError_api, GetDrilledWellboreHeadersResponse_api, GetFieldWellTrajectoriesData_api, GetFieldWellTrajectoriesError_api, GetFieldWellTrajectoriesResponse_api, GetWellTrajectoriesData_api, GetWellTrajectoriesError_api, GetWellTrajectoriesResponse_api, GetWellborePicksAndStratigraphicUnitsData_api, GetWellborePicksAndStratigraphicUnitsError_api, GetWellborePicksAndStratigraphicUnitsResponse_api, GetWellboreCompletionsData_api, GetWellboreCompletionsError_api, GetWellboreCompletionsResponse_api, GetWellboreCasingsData_api, GetWellboreCasingsError_api, GetWellboreCasingsResponse_api, GetWellborePerforationsData_api, GetWellborePerforationsError_api, GetWellborePerforationsResponse_api, GetWellboreLogCurveHeadersData_api, GetWellboreLogCurveHeadersError_api, GetWellboreLogCurveHeadersResponse_api, GetLogCurveDataData_api, GetLogCurveDataError_api, GetLogCurveDataResponse_api, GetSeismicCubeMetaListData_api, GetSeismicCubeMetaListError_api, GetSeismicCubeMetaListResponse_api, PostGetSeismicFenceData_api, PostGetSeismicFenceError_api, PostGetSeismicFenceResponse_api, GetPolygonsDirectoryData_api, GetPolygonsDirectoryError_api, GetPolygonsDirectoryResponse_api, GetPolygonsDataData_api, GetPolygonsDataError_api, GetPolygonsDataResponse_api, UserInfoData_api, UserInfoError_api, UserInfoResponse_api, GetObservationsData_api, GetObservationsError_api, GetObservationsResponse_api, GetRftInfoData_api, GetRftInfoError_api, GetRftInfoResponse_api, GetRealizationDataData_api, GetRealizationDataError_api, GetRealizationDataResponse_api, GetVfpTableNamesData_api, GetVfpTableNamesError_api, GetVfpTableNamesResponse_api, GetVfpTableData_api, GetVfpTableError_api, GetVfpTableResponse_api, LoginRouteData_api, LoginRouteError_api, LoginRouteResponse_api, AuthorizedCallbackRouteError_api, AuthorizedCallbackRouteResponse_api, AliveError_api, AliveResponse_api, AliveProtectedError_api, AliveProtectedResponse_api, LoggedInUserData_api, LoggedInUserError_api, LoggedInUserResponse_api, RootError_api, RootResponse_api } from './types.gen';

export const client = createClient(createConfig());

/**
 * Get Fields
 * Get list of fields
 */
export const getFields = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<unknown, ThrowOnError>) => {
    return (options?.client ?? client).get<GetFieldsResponse_api, GetFieldsError_api, ThrowOnError>({
        ...options,
        url: '/fields'
    });
};

/**
 * Get Cases
 * Get list of cases for specified field
 */
export const getCases = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetCasesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetCasesResponse_api, GetCasesError_api, ThrowOnError>({
        ...options,
        url: '/cases'
    });
};

/**
 * Get Ensembles
 * Get list of ensembles for a case
 */
export const getEnsembles = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetEnsemblesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetEnsemblesResponse_api, GetEnsemblesError_api, ThrowOnError>({
        ...options,
        url: '/cases/{case_uuid}/ensembles'
    });
};

/**
 * Get Ensemble Details
 * Get more detailed information for an ensemble
 */
export const getEnsembleDetails = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetEnsembleDetailsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetEnsembleDetailsResponse_api, GetEnsembleDetailsError_api, ThrowOnError>({
        ...options,
        url: '/cases/{case_uuid}/ensembles/{ensemble_name}'
    });
};

/**
 * Get Vector List
 * Get list of all vectors in a given Sumo ensemble, excluding any historical vectors
 */
export const getVectorList = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetVectorListData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetVectorListResponse_api, GetVectorListError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/vector_list/'
    });
};

/**
 * Get Realizations Vector Data
 * Get vector data per realization
 */
export const getRealizationsVectorData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRealizationsVectorDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRealizationsVectorDataResponse_api, GetRealizationsVectorDataError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/realizations_vector_data/'
    });
};

/**
 * Get Timestamps List
 * Get the intersection of available timestamps.
 * Note that when resampling_frequency is None, the pure intersection of the
 * stored raw dates will be returned. Thus the returned list of dates will not include
 * dates from long running realizations.
 * For other resampling frequencies, the date range will be expanded to cover the entire
 * time range of all the requested realizations before computing the resampled dates.
 */
export const getTimestampsList = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetTimestampsListData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetTimestampsListResponse_api, GetTimestampsListError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/timestamps_list/'
    });
};

/**
 * Get Historical Vector Data
 */
export const getHistoricalVectorData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetHistoricalVectorDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetHistoricalVectorDataResponse_api, GetHistoricalVectorDataError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/historical_vector_data/'
    });
};

/**
 * Get Statistical Vector Data
 * Get statistical vector data for an ensemble
 */
export const getStatisticalVectorData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetStatisticalVectorDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetStatisticalVectorDataResponse_api, GetStatisticalVectorDataError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/statistical_vector_data/'
    });
};

/**
 * Get Statistical Vector Data Per Sensitivity
 * Get statistical vector data for an ensemble per sensitivity
 */
export const getStatisticalVectorDataPerSensitivity = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetStatisticalVectorDataPerSensitivityData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetStatisticalVectorDataPerSensitivityResponse_api, GetStatisticalVectorDataPerSensitivityError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/statistical_vector_data_per_sensitivity/'
    });
};

/**
 * Get Realization Vector At Timestamp
 */
export const getRealizationVectorAtTimestamp = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRealizationVectorAtTimestampData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRealizationVectorAtTimestampResponse_api, GetRealizationVectorAtTimestampError_api, ThrowOnError>({
        ...options,
        url: '/timeseries/realization_vector_at_timestamp/'
    });
};

/**
 * Get Table Definitions
 * Get the volumetric tables definitions for a given ensemble.
 */
export const getTableDefinitions = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetTableDefinitionsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetTableDefinitionsResponse_api, GetTableDefinitionsError_api, ThrowOnError>({
        ...options,
        url: '/inplace_volumetrics/table_definitions/'
    });
};

/**
 * Post Get Aggregated Per Realization Table Data
 * Get aggregated volumetric data for a given table with data per realization based on requested results and categories/index filter.
 *
 * Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
 * As the endpoint is post, the identifiers with values object is kept for convenience.
 */
export const postGetAggregatedPerRealizationTableData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostGetAggregatedPerRealizationTableDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostGetAggregatedPerRealizationTableDataResponse_api, PostGetAggregatedPerRealizationTableDataError_api, ThrowOnError>({
        ...options,
        url: '/inplace_volumetrics/get_aggregated_per_realization_table_data/'
    });
};

/**
 * Post Get Aggregated Statistical Table Data
 * Get statistical volumetric data across selected realizations for a given table based on requested results and categories/index filter.
 *
 * Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
 * As the endpoint is post, the identifiers with values object is kept for convenience.
 */
export const postGetAggregatedStatisticalTableData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostGetAggregatedStatisticalTableDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostGetAggregatedStatisticalTableDataResponse_api, PostGetAggregatedStatisticalTableDataError_api, ThrowOnError>({
        ...options,
        url: '/inplace_volumetrics/get_aggregated_statistical_table_data/'
    });
};

/**
 * Get Realization Surfaces Metadata
 * Get metadata for realization surfaces in a Sumo ensemble
 */
export const getRealizationSurfacesMetadata = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRealizationSurfacesMetadataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRealizationSurfacesMetadataResponse_api, GetRealizationSurfacesMetadataError_api, ThrowOnError>({
        ...options,
        url: '/surface/realization_surfaces_metadata/'
    });
};

/**
 * Get Observed Surfaces Metadata
 * Get metadata for observed surfaces in a Sumo case
 */
export const getObservedSurfacesMetadata = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetObservedSurfacesMetadataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetObservedSurfacesMetadataResponse_api, GetObservedSurfacesMetadataError_api, ThrowOnError>({
        ...options,
        url: '/surface/observed_surfaces_metadata/'
    });
};

/**
 * Get Surface Data
 * Get surface data for the specified surface.
 *
 * ---
 * *General description of the types of surface addresses that exist. The specific address types supported by this endpoint can be a subset of these.*
 *
 * - *REAL* - Realization surface address. Addresses a specific realization surface within an ensemble. Always specifies a single realization number
 * - *OBS* - Observed surface address. Addresses an observed surface which is not associated with any specific ensemble.
 * - *STAT* - Statistical surface address. Fully specifies a statistical surface, including the statistic function and which realizations to include.
 * - *PARTIAL* - Partial surface address. Similar to a realization surface address, but does not include a specific realization number.
 *
 * Structure of the different types of address strings:
 *
 * ```
 * REAL~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>~~<realization>[~~<iso_date_or_interval>]
 * STAT~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>~~<stat_function>~~<stat_realizations>[~~<iso_date_or_interval>]
 * OBS~~<case_uuid>~~<surface_name>~~<attribute>~~<iso_date_or_interval>
 * PARTIAL~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>[~~<iso_date_or_interval>]
 * ```
 *
 * The `<stat_realizations>` component in a *STAT* address contains the list of realizations to include in the statistics
 * encoded as a `UintListStr` or "*" to include all realizations.
 */
export const getSurfaceData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetSurfaceDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetSurfaceDataResponse_api, GetSurfaceDataError_api, ThrowOnError>({
        ...options,
        url: '/surface/surface_data'
    });
};

/**
 * Post Get Surface Intersection
 * Get surface intersection data for requested surface name.
 *
 * The surface intersection data for surface name contains: An array of z-points, i.e. one z-value/depth per (x, y)-point in polyline,
 * and cumulative lengths, the accumulated length at each z-point in the array.
 */
export const postGetSurfaceIntersection = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostGetSurfaceIntersectionData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostGetSurfaceIntersectionResponse_api, PostGetSurfaceIntersectionError_api, ThrowOnError>({
        ...options,
        url: '/surface/get_surface_intersection'
    });
};

/**
 * Post Sample Surface In Points
 */
export const postSampleSurfaceInPoints = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostSampleSurfaceInPointsData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostSampleSurfaceInPointsResponse_api, PostSampleSurfaceInPointsError_api, ThrowOnError>({
        ...options,
        url: '/surface/sample_surface_in_points'
    });
};

/**
 * Get Delta Surface Data
 */
export const getDeltaSurfaceData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetDeltaSurfaceDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetDeltaSurfaceDataResponse_api, GetDeltaSurfaceDataError_api, ThrowOnError>({
        ...options,
        url: '/surface/delta_surface_data'
    });
};

/**
 * Get Misfit Surface Data
 */
export const getMisfitSurfaceData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetMisfitSurfaceDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetMisfitSurfaceDataResponse_api, GetMisfitSurfaceDataError_api, ThrowOnError>({
        ...options,
        url: '/surface/misfit_surface_data'
    });
};

/**
 * Get Parameter Names And Description
 * Retrieve parameter names and description for an ensemble
 */
export const getParameterNamesAndDescription = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetParameterNamesAndDescriptionData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetParameterNamesAndDescriptionResponse_api, GetParameterNamesAndDescriptionError_api, ThrowOnError>({
        ...options,
        url: '/parameters/parameter_names_and_description/'
    });
};

/**
 * Get Parameter
 * Get a parameter in a given Sumo ensemble
 */
export const getParameter = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetParameterData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetParameterResponse_api, GetParameterError_api, ThrowOnError>({
        ...options,
        url: '/parameters/parameter/'
    });
};

/**
 * Get Parameters
 */
export const getParameters = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetParametersData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetParametersResponse_api, GetParametersError_api, ThrowOnError>({
        ...options,
        url: '/parameters/parameters/'
    });
};

/**
 * Is Sensitivity Run
 * Check if a given Sumo ensemble is a sensitivity run
 */
export const isSensitivityRun = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<IsSensitivityRunData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<IsSensitivityRunResponse_api, IsSensitivityRunError_api, ThrowOnError>({
        ...options,
        url: '/parameters/is_sensitivity_run/'
    });
};

/**
 * Get Sensitivities
 * Get sensitivities in a given Sumo ensemble
 */
export const getSensitivities = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetSensitivitiesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetSensitivitiesResponse_api, GetSensitivitiesError_api, ThrowOnError>({
        ...options,
        url: '/parameters/sensitivities/'
    });
};

/**
 * Get Grid Models Info
 * Get metadata for all 3D grid models, including bbox, dimensions and properties
 */
export const getGridModelsInfo = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetGridModelsInfoData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetGridModelsInfoResponse_api, GetGridModelsInfoError_api, ThrowOnError>({
        ...options,
        url: '/grid3d/grid_models_info/'
    });
};

/**
 * Is Grid Geometry Shared
 * Check if a 3D grid geometry is shared across realizations
 */
export const isGridGeometryShared = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<IsGridGeometrySharedData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<IsGridGeometrySharedResponse_api, IsGridGeometrySharedError_api, ThrowOnError>({
        ...options,
        url: '/grid3d/is_grid_geometry_shared/'
    });
};

/**
 * Grid Surface
 * Get a grid
 */
export const gridSurface = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GridSurfaceData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GridSurfaceResponse_api, GridSurfaceError_api, ThrowOnError>({
        ...options,
        url: '/grid3d/grid_surface'
    });
};

/**
 * Grid Parameter
 * Get a grid parameter
 */
export const gridParameter = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GridParameterData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GridParameterResponse_api, GridParameterError_api, ThrowOnError>({
        ...options,
        url: '/grid3d/grid_parameter'
    });
};

/**
 * Post Get Polyline Intersection
 */
export const postGetPolylineIntersection = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostGetPolylineIntersectionData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostGetPolylineIntersectionResponse_api, PostGetPolylineIntersectionError_api, ThrowOnError>({
        ...options,
        url: '/grid3d/get_polyline_intersection'
    });
};

/**
 * Get Realization Group Tree Data
 */
export const getRealizationGroupTreeData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRealizationGroupTreeDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRealizationGroupTreeDataResponse_api, GetRealizationGroupTreeDataError_api, ThrowOnError>({
        ...options,
        url: '/group_tree/realization_group_tree_data/'
    });
};

/**
 * Table Data
 * Get pvt table data for a given Sumo ensemble and realization
 */
export const tableData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<TableDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<TableDataResponse_api, TableDataError_api, ThrowOnError>({
        ...options,
        url: '/pvt/table_data/'
    });
};

/**
 * Realizations Tables Are Equal
 * Check if all realizations has the same pvt table
 */
export const realizationsTablesAreEqual = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<RealizationsTablesAreEqualData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<RealizationsTablesAreEqualResponse_api, RealizationsTablesAreEqualError_api, ThrowOnError>({
        ...options,
        url: '/pvt/realizations_tables_are_equal/'
    });
};

/**
 * Get Well Completions Data
 */
export const getWellCompletionsData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellCompletionsDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellCompletionsDataResponse_api, GetWellCompletionsDataError_api, ThrowOnError>({
        ...options,
        url: '/well_completions/well_completions_data/'
    });
};

/**
 * Get Drilled Wellbore Headers
 * Get wellbore headers for all wells in the field
 */
export const getDrilledWellboreHeaders = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetDrilledWellboreHeadersData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetDrilledWellboreHeadersResponse_api, GetDrilledWellboreHeadersError_api, ThrowOnError>({
        ...options,
        url: '/well/drilled_wellbore_headers/'
    });
};

/**
 * Get Field Well Trajectories
 * Get well trajectories for field
 */
export const getFieldWellTrajectories = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetFieldWellTrajectoriesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetFieldWellTrajectoriesResponse_api, GetFieldWellTrajectoriesError_api, ThrowOnError>({
        ...options,
        url: '/well/field_well_trajectories/'
    });
};

/**
 * Get Well Trajectories
 * Get well trajectories
 */
export const getWellTrajectories = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellTrajectoriesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellTrajectoriesResponse_api, GetWellTrajectoriesError_api, ThrowOnError>({
        ...options,
        url: '/well/well_trajectories/'
    });
};

/**
 * Get Wellbore Picks And Stratigraphic Units
 * Get well bore picks for a single well bore
 */
export const getWellborePicksAndStratigraphicUnits = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellborePicksAndStratigraphicUnitsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellborePicksAndStratigraphicUnitsResponse_api, GetWellborePicksAndStratigraphicUnitsError_api, ThrowOnError>({
        ...options,
        url: '/well/wellbore_picks_and_stratigraphic_units/'
    });
};

/**
 * Get Wellbore Completions
 * Get well bore completions for a single well bore
 */
export const getWellboreCompletions = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellboreCompletionsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellboreCompletionsResponse_api, GetWellboreCompletionsError_api, ThrowOnError>({
        ...options,
        url: '/well/wellbore_completions/'
    });
};

/**
 * Get Wellbore Casings
 * Get well bore casings for a single well bore
 */
export const getWellboreCasings = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellboreCasingsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellboreCasingsResponse_api, GetWellboreCasingsError_api, ThrowOnError>({
        ...options,
        url: '/well/wellbore_casings/'
    });
};

/**
 * Get Wellbore Perforations
 * Get well bore casing for a single well bore
 */
export const getWellborePerforations = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellborePerforationsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellborePerforationsResponse_api, GetWellborePerforationsError_api, ThrowOnError>({
        ...options,
        url: '/well/wellbore_perforations/'
    });
};

/**
 * Get Wellbore Log Curve Headers
 * Get all log curve headers for a single well bore
 */
export const getWellboreLogCurveHeaders = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetWellboreLogCurveHeadersData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetWellboreLogCurveHeadersResponse_api, GetWellboreLogCurveHeadersError_api, ThrowOnError>({
        ...options,
        url: '/well/wellbore_log_curve_headers/'
    });
};

/**
 * Get Log Curve Data
 * Get log curve data
 */
export const getLogCurveData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetLogCurveDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetLogCurveDataResponse_api, GetLogCurveDataError_api, ThrowOnError>({
        ...options,
        url: '/well/log_curve_data/'
    });
};

/**
 * Get Seismic Cube Meta List
 * Get a list of seismic cube meta.
 */
export const getSeismicCubeMetaList = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetSeismicCubeMetaListData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetSeismicCubeMetaListResponse_api, GetSeismicCubeMetaListError_api, ThrowOnError>({
        ...options,
        url: '/seismic/seismic_cube_meta_list/'
    });
};

/**
 * Post Get Seismic Fence
 * Get a fence of seismic data from a polyline defined by a set of (x, y) coordinates in domain coordinate system.
 *
 * The fence data contains a set of traces perpendicular to the polyline, with one trace per (x, y)-point in polyline.
 * Each trace has equal number of samples, and is a set of sample values along the depth direction of the seismic cube.
 *
 * Returns:
 * A SeismicFenceData object with fence traces in encoded 1D array, metadata for trace array decoding and fence min/max depth.
 */
export const postGetSeismicFence = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<PostGetSeismicFenceData_api, ThrowOnError>) => {
    return (options?.client ?? client).post<PostGetSeismicFenceResponse_api, PostGetSeismicFenceError_api, ThrowOnError>({
        ...options,
        url: '/seismic/get_seismic_fence/'
    });
};

/**
 * Get Polygons Directory
 * Get a directory of polygons in a Sumo ensemble
 */
export const getPolygonsDirectory = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetPolygonsDirectoryData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetPolygonsDirectoryResponse_api, GetPolygonsDirectoryError_api, ThrowOnError>({
        ...options,
        url: '/polygons/polygons_directory/'
    });
};

/**
 * Get Polygons Data
 */
export const getPolygonsData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetPolygonsDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetPolygonsDataResponse_api, GetPolygonsDataError_api, ThrowOnError>({
        ...options,
        url: '/polygons/polygons_data/'
    });
};

/**
 * User Info
 * Get username, display name and avatar from Microsoft Graph API for a given user id
 */
export const userInfo = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<UserInfoData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<UserInfoResponse_api, UserInfoError_api, ThrowOnError>({
        ...options,
        url: '/graph/user_photo/'
    });
};

/**
 * Get Observations
 * Retrieve all observations found in sumo case
 */
export const getObservations = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetObservationsData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetObservationsResponse_api, GetObservationsError_api, ThrowOnError>({
        ...options,
        url: '/observations/observations/'
    });
};

/**
 * Get Rft Info
 */
export const getRftInfo = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRftInfoData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRftInfoResponse_api, GetRftInfoError_api, ThrowOnError>({
        ...options,
        url: '/rft/rft_info'
    });
};

/**
 * Get Realization Data
 */
export const getRealizationData = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetRealizationDataData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetRealizationDataResponse_api, GetRealizationDataError_api, ThrowOnError>({
        ...options,
        url: '/rft/realization_data'
    });
};

/**
 * Get Vfp Table Names
 */
export const getVfpTableNames = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetVfpTableNamesData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetVfpTableNamesResponse_api, GetVfpTableNamesError_api, ThrowOnError>({
        ...options,
        url: '/vfp/vfp_table_names/'
    });
};

/**
 * Get Vfp Table
 */
export const getVfpTable = <ThrowOnError extends boolean = false>(options: OptionsLegacyParser<GetVfpTableData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<GetVfpTableResponse_api, GetVfpTableError_api, ThrowOnError>({
        ...options,
        url: '/vfp/vfp_table/'
    });
};

/**
 *  Login Route
 */
export const loginRoute = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<LoginRouteData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<LoginRouteResponse_api, LoginRouteError_api, ThrowOnError>({
        ...options,
        url: '/login'
    });
};

/**
 *  Authorized Callback Route
 */
export const authorizedCallbackRoute = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<unknown, ThrowOnError>) => {
    return (options?.client ?? client).get<AuthorizedCallbackRouteResponse_api, AuthorizedCallbackRouteError_api, ThrowOnError>({
        ...options,
        url: '/auth-callback'
    });
};

/**
 * Alive
 */
export const alive = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<unknown, ThrowOnError>) => {
    return (options?.client ?? client).get<AliveResponse_api, AliveError_api, ThrowOnError>({
        ...options,
        url: '/alive'
    });
};

/**
 * Alive Protected
 */
export const aliveProtected = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<unknown, ThrowOnError>) => {
    return (options?.client ?? client).get<AliveProtectedResponse_api, AliveProtectedError_api, ThrowOnError>({
        ...options,
        url: '/alive_protected'
    });
};

/**
 * Logged In User
 */
export const loggedInUser = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<LoggedInUserData_api, ThrowOnError>) => {
    return (options?.client ?? client).get<LoggedInUserResponse_api, LoggedInUserError_api, ThrowOnError>({
        ...options,
        url: '/logged_in_user'
    });
};

/**
 * Root
 */
export const root = <ThrowOnError extends boolean = false>(options?: OptionsLegacyParser<unknown, ThrowOnError>) => {
    return (options?.client ?? client).get<RootResponse_api, RootError_api, ThrowOnError>({
        ...options,
        url: '/'
    });
};