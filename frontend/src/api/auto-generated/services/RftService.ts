/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RftRealizationData } from '../models/RftRealizationData';
import type { RftTableDefinition } from '../models/RftTableDefinition';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class RftService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Definition
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns RftTableDefinition Successful Response
     * @throws ApiError
     */
    public getTableDefinition(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<RftTableDefinition> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rft/table_definition',
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
     * Get Realization Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param wellName Well name
     * @param responseName Response name
     * @param timestampsUtcMs Timestamps utc ms
     * @param realizationsEncodedAsUintListStr Optional list of realizations encoded as string to include. If not specified, all realizations will be included.
     * @returns RftRealizationData Successful Response
     * @throws ApiError
     */
    public getRealizationData(
        caseUuid: string,
        ensembleName: string,
        wellName: string,
        responseName: string,
        timestampsUtcMs?: (Array<number> | null),
        realizationsEncodedAsUintListStr?: (string | null),
    ): CancelablePromise<Array<RftRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rft/realization_data',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'well_name': wellName,
                'response_name': responseName,
                'timestamps_utc_ms': timestampsUtcMs,
                'realizations_encoded_as_uint_list_str': realizationsEncodedAsUintListStr,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
