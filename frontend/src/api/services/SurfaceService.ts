/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DynamicSurfaceDirectory } from '../models/DynamicSurfaceDirectory';
import type { StaticSurfaceDirectory } from '../models/StaticSurfaceDirectory';
import type { SurfaceData } from '../models/SurfaceData';
import type { SurfaceStatisticFunction } from '../models/SurfaceStatisticFunction';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SurfaceService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Dynamic Surface Directory
     * Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns DynamicSurfaceDirectory Successful Response
     * @throws ApiError
     */
    public getDynamicSurfaceDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<DynamicSurfaceDirectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/dynamic_surface_directory/',
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
     * Get Static Surface Directory
     * Get a directory of surface names and attributes for static surfaces.
     * These are the non-observed surfaces that do NOT have time stamps
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns StaticSurfaceDirectory Successful Response
     * @throws ApiError
     */
    public getStaticSurfaceDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<StaticSurfaceDirectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/static_surface_directory/',
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
     * Get Static Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getStaticSurfaceData(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/static_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'name': name,
                'attribute': attribute,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Dynamic Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @param timeOrInterval Timestamp or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getDynamicSurfaceData(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
        timeOrInterval: string,
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/dynamic_surface_data/',
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
     * Get Statistical Dynamic Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statisticFunction Statistics to calculate
     * @param name Surface name
     * @param attribute Surface attribute
     * @param timeOrInterval Timestamp or time interval string
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getStatisticalDynamicSurfaceData(
        caseUuid: string,
        ensembleName: string,
        statisticFunction: SurfaceStatisticFunction,
        name: string,
        attribute: string,
        timeOrInterval: string,
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/statistical_dynamic_surface_data/',
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
     * Get Statistical Static Surface Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statisticFunction Statistics to calculate
     * @param name Surface name
     * @param attribute Surface attribute
     * @returns SurfaceData Successful Response
     * @throws ApiError
     */
    public getStatisticalStaticSurfaceData(
        caseUuid: string,
        ensembleName: string,
        statisticFunction: SurfaceStatisticFunction,
        name: string,
        attribute: string,
    ): CancelablePromise<SurfaceData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface/statistical_static_surface_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'statistic_function': statisticFunction,
                'name': name,
                'attribute': attribute,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
