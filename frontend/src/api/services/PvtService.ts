/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TableMetaData } from '../models/TableMetaData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class PvtService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Table Metadata
     * Get pvt table metadata for a given Sumo ensemble and realization
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization number
     * @returns TableMetaData Successful Response
     * @throws ApiError
     */
    public tableMetadata(
        caseUuid: string,
        ensembleName: string,
        realization: number,
    ): CancelablePromise<TableMetaData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/pvt/table_metadata/',
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
     * Table Data
     * Get pvt table data for a given Sumo ensemble and realization
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization number
     * @returns any Successful Response
     * @throws ApiError
     */
    public tableData(
        caseUuid: string,
        ensembleName: string,
        realization: number,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/pvt/table_data/',
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
     * Realizations Tables Are Equal
     * Check if all realizations of a given table are equal
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public realizationsTablesAreEqual(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<boolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/pvt/realizations_tables_are_equal/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
