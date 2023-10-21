/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SurfaceData } from '../models/SurfaceData';
import type { SurfaceMeta } from '../models/SurfaceMeta';
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
     * Get Observed Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param name Surface name
     * @param attribute Surface attribute
     * @param timeOrInterval Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getObservedSurfaceData(
        caseUuid: string,
        ensembleName: string,
        name: string,
        attribute: string,
        timeOrInterval?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/observed_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
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
     * Get Resampled Realization Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param ncolMesh Realization number
     * @param nrowMesh Surface name
     * @param xincMesh Surface attribute
     * @param yincMesh Surface attribute
     * @param xoriMesh Surface attribute
     * @param yoriMesh Surface attribute
     * @param rotationMesh Surface attribute
     * @param realizationNumProperty Realization number
     * @param nameProperty Surface name
     * @param attributeProperty Surface attribute
     * @param timeOrIntervalProperty Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getResampledRealizationSurfaceData(
        caseUuid: string,
        ensembleName: string,
        ncolMesh: number,
        nrowMesh: number,
        xincMesh: number,
        yincMesh: number,
        xoriMesh: number,
        yoriMesh: number,
        rotationMesh: number,
        realizationNumProperty: number,
        nameProperty: string,
        attributeProperty: string,
        timeOrIntervalProperty?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/resampled_realization_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'ncol_mesh': ncolMesh,
                'nrow_mesh': nrowMesh,
                'xinc_mesh': xincMesh,
                'yinc_mesh': yincMesh,
                'xori_mesh': xoriMesh,
                'yori_mesh': yoriMesh,
                'rotation_mesh': rotationMesh,
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
     * Get Resampled Observed Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param ncolMesh Realization number
     * @param nrowMesh Surface name
     * @param xincMesh Surface attribute
     * @param yincMesh Surface attribute
     * @param xoriMesh Surface attribute
     * @param yoriMesh Surface attribute
     * @param rotationMesh Surface attribute
     * @param nameProperty Surface name
     * @param attributeProperty Surface attribute
     * @param timeOrIntervalProperty Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getResampledObservedSurfaceData(
        caseUuid: string,
        ensembleName: string,
        ncolMesh: number,
        nrowMesh: number,
        xincMesh: number,
        yincMesh: number,
        xoriMesh: number,
        yoriMesh: number,
        rotationMesh: number,
        nameProperty: string,
        attributeProperty: string,
        timeOrIntervalProperty?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/resampled_observed_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'ncol_mesh': ncolMesh,
                'nrow_mesh': nrowMesh,
                'xinc_mesh': xincMesh,
                'yinc_mesh': yincMesh,
                'xori_mesh': xoriMesh,
                'yori_mesh': yoriMesh,
                'rotation_mesh': rotationMesh,
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
     * Get Resampled Statistical Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statisticFunction Statistics to calculate
     * @param ncolMesh Realization number
     * @param nrowMesh Surface name
     * @param xincMesh Surface attribute
     * @param yincMesh Surface attribute
     * @param xoriMesh Surface attribute
     * @param yoriMesh Surface attribute
     * @param rotationMesh Surface attribute
     * @param nameProperty Surface name
     * @param attributeProperty Surface attribute
     * @param timeOrIntervalProperty Time point or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getResampledStatisticalSurfaceData(
        caseUuid: string,
        ensembleName: string,
        statisticFunction: SurfaceStatisticFunction,
        ncolMesh: number,
        nrowMesh: number,
        xincMesh: number,
        yincMesh: number,
        xoriMesh: number,
        yoriMesh: number,
        rotationMesh: number,
        nameProperty: string,
        attributeProperty: string,
        timeOrIntervalProperty?: (string | null),
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/resampled_statistical_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'statistic_function': statisticFunction,
                'ncol_mesh': ncolMesh,
                'nrow_mesh': nrowMesh,
                'xinc_mesh': xincMesh,
                'yinc_mesh': yincMesh,
                'xori_mesh': xoriMesh,
                'yori_mesh': yoriMesh,
                'rotation_mesh': rotationMesh,
                'name_property': nameProperty,
                'attribute_property': attributeProperty,
                'time_or_interval_property': timeOrIntervalProperty,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
