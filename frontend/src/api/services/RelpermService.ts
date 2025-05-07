/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RelPermRealizationData } from '../models/RelPermRealizationData';
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
     * Get Saturation And Curve Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param saturationAxisName Saturation axis name
     * @param curveNames Curve names
     * @param satnums Satnums
     * @returns RelPermRealizationData Successful Response
     * @throws ApiError
     */
    public getSaturationAndCurveData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        saturationAxisName: string,
        curveNames: Array<string>,
        satnums: Array<number>,
    ): CancelablePromise<Array<RelPermRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relperm/saturation_and_curve_data',
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
