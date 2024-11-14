/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RelPermRealizationDataForSaturation } from '../models/RelPermRealizationDataForSaturation';
import type { RelPermStatisticalDataForSaturation } from '../models/RelPermStatisticalDataForSaturation';
import type { RelPermTableInfo } from '../models/RelPermTableInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RelpermService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Names
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns string Successful Response
     * @throws ApiError
     */
    public getTableNames(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relperm/table_names',
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
     * Get Table Info
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @returns RelPermTableInfo Successful Response
     * @throws ApiError
     */
    public getTableInfo(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
    ): CancelablePromise<RelPermTableInfo> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relperm/table_info',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Realizations Curve Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param saturationAxisName Saturation axis name
     * @param curveNames Curve names
     * @param satnums Satnums
     * @returns RelPermRealizationDataForSaturation Successful Response
     * @throws ApiError
     */
    public getRealizationsCurveData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        saturationAxisName: string,
        curveNames: Array<string>,
        satnums: Array<number>,
    ): CancelablePromise<RelPermRealizationDataForSaturation> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relperm/realizations_curve_data',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'saturation_axis_name': saturationAxisName,
                'curve_names': curveNames,
                'satnums': satnums,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Statistical Curve Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param saturationAxisName Saturation axis name
     * @param curveNames Curve names
     * @param satnums Satnums
     * @returns RelPermStatisticalDataForSaturation Successful Response
     * @throws ApiError
     */
    public getStatisticalCurveData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        saturationAxisName: string,
        curveNames: Array<string>,
        satnums: Array<number>,
    ): CancelablePromise<RelPermStatisticalDataForSaturation> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relperm/statistical_curve_data',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'saturation_axis_name': saturationAxisName,
                'curve_names': curveNames,
                'satnums': satnums,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
