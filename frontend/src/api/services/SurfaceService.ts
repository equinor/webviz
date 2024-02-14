/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_post_get_surface_intersection } from '../models/Body_post_get_surface_intersection';
import type { Body_post_sample_surface_in_points } from '../models/Body_post_sample_surface_in_points';
import type { SurfaceData } from '../models/SurfaceData';
import type { SurfaceIntersectionData } from '../models/SurfaceIntersectionData';
import type { SurfaceMeta } from '../models/SurfaceMeta';
import type { SurfaceRealizationSampleValues } from '../models/SurfaceRealizationSampleValues';
import type { SurfaceStatisticFunction } from '../models/SurfaceStatisticFunction';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class SurfaceService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Surface Directory
     * Get a directory of surfaces in a Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SurfaceMeta Successful Response
     * @throws ApiError
     */
    public getSurfaceDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<SurfaceMeta>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/surface_directory/',
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
     * Get Realization Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @param timeOrInterval Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getRealizationSurfaceData(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
        timeOrInterval?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/realization_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'name': name,
                'attribute': attribute,
                'time_or_interval': timeOrInterval,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Statistical Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statisticFunction Statistics to calculate
     * @param name Surface name
     * @param attribute Surface attribute
     * @param timeOrInterval Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getStatisticalSurfaceData(
        caseUuid: string,
        ensembleName: string,
        statisticFunction: SurfaceStatisticFunction,
        name: string,
        attribute: string,
        timeOrInterval?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/statistical_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'statistic_function': statisticFunction,
                'name': name,
                'attribute': attribute,
                'time_or_interval': timeOrInterval,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Property Surface Resampled To Static Surface
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNumMesh Realization number
     * @param nameMesh Surface name
     * @param attributeMesh Surface attribute
     * @param realizationNumProperty Realization number
     * @param nameProperty Surface name
     * @param attributeProperty Surface attribute
     * @param timeOrIntervalProperty Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getPropertySurfaceResampledToStaticSurface(
        caseUuid: string,
        ensembleName: string,
        realizationNumMesh: number,
        nameMesh: string,
        attributeMesh: string,
        realizationNumProperty: number,
        nameProperty: string,
        attributeProperty: string,
        timeOrIntervalProperty?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/property_surface_resampled_to_static_surface/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num_mesh': realizationNumMesh,
                'name_mesh': nameMesh,
                'attribute_mesh': attributeMesh,
                'realization_num_property': realizationNumProperty,
                'name_property': nameProperty,
                'attribute_property': attributeProperty,
                'time_or_interval_property': timeOrIntervalProperty,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Property Surface Resampled To Statistical Static Surface
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statisticFunction Statistics to calculate
     * @param nameMesh Surface name
     * @param attributeMesh Surface attribute
     * @param nameProperty Surface name
     * @param attributeProperty Surface attribute
     * @param timeOrIntervalProperty Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getPropertySurfaceResampledToStatisticalStaticSurface(
        caseUuid: string,
        ensembleName: string,
        statisticFunction: SurfaceStatisticFunction,
        nameMesh: string,
        attributeMesh: string,
        nameProperty: string,
        attributeProperty: string,
        timeOrIntervalProperty?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/property_surface_resampled_to_statistical_static_surface/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'statistic_function': statisticFunction,
                'name_mesh': nameMesh,
                'attribute_mesh': attributeMesh,
                'name_property': nameProperty,
                'attribute_property': attributeProperty,
                'time_or_interval_property': timeOrIntervalProperty,
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
            url: '/surfaceget_surface_intersection',
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
}
