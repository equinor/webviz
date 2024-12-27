/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellCompletionsData } from '../models/WellCompletionsData';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WellCompletionsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Well Completions Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Optional realizations to include. Provide single realization or list of realizations. If not specified, all realizations will be returned.
     * @returns WellCompletionsData Successful Response
     * @throws ApiError
     */
    public getWellCompletionsData(
        caseUuid: string,
        ensembleName: string,
        realization?: (number | Array<number> | null),
    ): CancelablePromise<WellCompletionsData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well_completions/well_completions_data/',
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
