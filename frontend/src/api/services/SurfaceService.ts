/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_post_get_surface_intersection } from '../models/Body_post_get_surface_intersection';
import type { Body_post_sample_surface_in_points } from '../models/Body_post_sample_surface_in_points';
import type { SurfaceDataFloat } from '../models/SurfaceDataFloat';
import type { SurfaceDataPng } from '../models/SurfaceDataPng';
import type { SurfaceIntersectionData } from '../models/SurfaceIntersectionData';
import type { SurfaceMetaSet } from '../models/SurfaceMetaSet';
import type { SurfaceRealizationSampleValues } from '../models/SurfaceRealizationSampleValues';
import type { SurfaceStatisticFunction } from '../models/SurfaceStatisticFunction';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SurfaceService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Realization Surfaces Metadata
     * Get metadata for realization surfaces in a Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SurfaceMetaSet Successful Response
     * @throws ApiError
     */
    public getRealizationSurfacesMetadata(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<SurfaceMetaSet> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/realization_surfaces_metadata/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Observed Surfaces Metadata
     * Get metadata for observed surfaces in a Sumo case
     * @param caseUuid Sumo case uuid
     * @returns SurfaceMetaSet Successful Response
     * @throws ApiError
     */
    public getObservedSurfacesMetadata(
        caseUuid: string,
    ): CancelablePromise<SurfaceMetaSet> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/observed_surfaces_metadata/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
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
     * @param surfAddrStr Surface address string, supported address types are *REAL*, *OBS* and *STAT*
     * @param dataFormat Format of binary data in the response
     * @param resampleToDefStr Definition of the surface onto which the data should be resampled. *SurfaceDef* object properties encoded as a `KeyValStr` string.
     * @returns any Successful Response
     * @throws ApiError
     */
    public getSurfaceData(
        surfAddrStr: string,
        dataFormat: 'float' | 'png' = 'float',
        resampleToDefStr?: (string | null),
    ): CancelablePromise<(SurfaceDataFloat | SurfaceDataPng)> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/surface_data',
            query: {
                'surf_addr_str': surfAddrStr,
                'data_format': dataFormat,
                'resample_to_def_str': resampleToDefStr,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Post Get Surface Intersection
     * Get surface intersection data for requested surface name.
     *
     * The surface intersection data for surface name contains: An array of z-points, i.e. one z-value/depth per (x, y)-point in polyline,
     * and cumulative lengths, the accumulated length at each z-point in the array.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @param requestBody
     * @param timeOrIntervalStr Time point or time interval string
     * @returns SurfaceIntersectionData Successful Response
     * @throws ApiError
     */
    public postGetSurfaceIntersection(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
        requestBody: Body_post_get_surface_intersection,
        timeOrIntervalStr?: (string | null),
    ): CancelablePromise<SurfaceIntersectionData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/surface/get_surface_intersection',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'name': name,
                'attribute': attribute,
                'time_or_interval_str': timeOrIntervalStr,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Post Sample Surface In Points
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param surfaceName Surface name
     * @param surfaceAttribute Surface attribute
     * @param realizationNums Realization numbers
     * @param requestBody
     * @returns SurfaceRealizationSampleValues Successful Response
     * @throws ApiError
     */
    public postSampleSurfaceInPoints(
        caseUuid: string,
        ensembleName: string,
        surfaceName: string,
        surfaceAttribute: string,
        realizationNums: Array<number>,
        requestBody: Body_post_sample_surface_in_points,
    ): CancelablePromise<Array<SurfaceRealizationSampleValues>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/surface/sample_surface_in_points',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'surface_name': surfaceName,
                'surface_attribute': surfaceAttribute,
                'realization_nums': realizationNums,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Delta Surface Data
     * @param surfAAddrStr Address string of surface A, supported types: *REAL*, *OBS* and *STAT*
     * @param surfBAddrStr Address string of surface B, supported types: *REAL*, *OBS* and *STAT*
     * @param dataFormat Format of binary data in the response
     * @param resampleToDefStr Definition of the surface onto which the data should be resampled. *SurfaceDef* object properties encoded as a `KeyValStr` string.
     * @returns SurfaceDataFloat Successful Response
     * @throws ApiError
     */
    public getDeltaSurfaceData(
        surfAAddrStr: string,
        surfBAddrStr: string,
        dataFormat: 'float' | 'png' = 'float',
        resampleToDefStr?: (string | null),
    ): CancelablePromise<Array<SurfaceDataFloat>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/delta_surface_data',
            query: {
                'surf_a_addr_str': surfAAddrStr,
                'surf_b_addr_str': surfBAddrStr,
                'data_format': dataFormat,
                'resample_to_def_str': resampleToDefStr,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Misfit Surface Data
     * @param obsSurfAddrStr Address of observed surface, only supported address type is *OBS*
     * @param simSurfAddrStr Address of simulated surface, supported type is *PARTIAL*
     * @param statisticFunctions Statistics to calculate
     * @param realizations Realization numbers
     * @param dataFormat Format of binary data in the response
     * @param resampleToDefStr Definition of the surface onto which the data should be resampled. *SurfaceDef* object properties encoded as a `KeyValStr` string.
     * @returns SurfaceDataFloat Successful Response
     * @throws ApiError
     */
    public getMisfitSurfaceData(
        obsSurfAddrStr: string,
        simSurfAddrStr: string,
        statisticFunctions: Array<SurfaceStatisticFunction>,
        realizations: Array<number>,
        dataFormat: 'float' | 'png' = 'float',
        resampleToDefStr?: (string | null),
    ): CancelablePromise<Array<SurfaceDataFloat>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/misfit_surface_data',
            query: {
                'obs_surf_addr_str': obsSurfAddrStr,
                'sim_surf_addr_str': simSurfAddrStr,
                'statistic_functions': statisticFunctions,
                'realizations': realizations,
                'data_format': dataFormat,
                'resample_to_def_str': resampleToDefStr,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
