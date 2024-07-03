/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class VfpService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Vfp names
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @returns a list of VFP names for an ensemble and realization
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
}