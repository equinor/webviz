/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_post_get_polyline_intersection } from '../models/Body_post_get_polyline_intersection';
import type { Grid3dGeometry } from '../models/Grid3dGeometry';
import type { Grid3dInfo } from '../models/Grid3dInfo';
import type { Grid3dMappedProperty } from '../models/Grid3dMappedProperty';
import type { PolylineIntersection } from '../models/PolylineIntersection';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class Grid3DService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Grid Models Info
     * Get metadata for all 3D grid models, including bbox, dimensions and properties
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization
     * @returns Grid3dInfo Successful Response
     * @throws ApiError
     */
    public getGridModelsInfo(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
    ): CancelablePromise<Array<Grid3dInfo>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_models_info/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Is Grid Geometry Shared
     * Check if a 3D grid geometry is shared across realizations
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public isGridGeometryShared(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
    ): CancelablePromise<boolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/is_grid_geometry_shared/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grid Surface
     * Get a grid
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param realizationNum Realization
     * @param iMin Min i index
     * @param iMax Max i index
     * @param jMin Min j index
     * @param jMax Max j index
     * @param kMin Min k index
     * @param kMax Max k index
     * @returns Grid3dGeometry Successful Response
     * @throws ApiError
     */
    public gridSurface(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        realizationNum: number,
        iMin?: number,
        iMax: number = -1,
        jMin?: number,
        jMax: number = -1,
        kMin?: number,
        kMax: number = -1,
    ): CancelablePromise<Grid3dGeometry> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_surface',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'realization_num': realizationNum,
                'i_min': iMin,
                'i_max': iMax,
                'j_min': jMin,
                'j_max': jMax,
                'k_min': kMin,
                'k_max': kMax,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grid Parameter
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizationNum Realization
     * @param parameterTimeOrIntervalStr Time point or time interval string
     * @param iMin Min i index
     * @param iMax Max i index
     * @param jMin Min j index
     * @param jMax Max j index
     * @param kMin Min k index
     * @param kMax Max k index
     * @returns Grid3dMappedProperty Successful Response
     * @throws ApiError
     */
    public gridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizationNum: number,
        parameterTimeOrIntervalStr?: (string | null),
        iMin?: number,
        iMax: number = -1,
        jMin?: number,
        jMax: number = -1,
        kMin?: number,
        kMax: number = -1,
    ): CancelablePromise<Grid3dMappedProperty> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_parameter',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realization_num': realizationNum,
                'parameter_time_or_interval_str': parameterTimeOrIntervalStr,
                'i_min': iMin,
                'i_max': iMax,
                'j_min': jMin,
                'j_max': jMax,
                'k_min': kMin,
                'k_max': kMax,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Post Get Polyline Intersection
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizationNum Realization
     * @param requestBody
     * @param parameterTimeOrIntervalStr Time point or time interval string
     * @returns PolylineIntersection Successful Response
     * @throws ApiError
     */
    public postGetPolylineIntersection(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizationNum: number,
        requestBody: Body_post_get_polyline_intersection,
        parameterTimeOrIntervalStr?: (string | null),
    ): CancelablePromise<PolylineIntersection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/grid3d/get_polyline_intersection',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realization_num': realizationNum,
                'parameter_time_or_interval_str': parameterTimeOrIntervalStr,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
