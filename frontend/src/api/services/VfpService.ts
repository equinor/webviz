/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VfpProdTable } from '../models/VfpProdTable';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class VfpService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Vfp Table Names
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @returns string Successful Response
     * @throws ApiError
     */
    public getVfpTableNames(
        caseUuid: string,
        ensembleName: string,
        realization: number,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/vfp/vfp_table_names/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Vfp Table
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @param vfpTableName VFP table name
     * @returns VfpProdTable Successful Response
     * @throws ApiError
     */
    public getVfpTable(
        caseUuid: string,
        ensembleName: string,
        realization: number,
        vfpTableName: string,
    ): CancelablePromise<VfpProdTable> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/vfp/vfp_table/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
                'vfp_table_name': vfpTableName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
