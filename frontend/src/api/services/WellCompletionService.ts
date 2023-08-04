/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellCompletionData } from '../models/WellCompletionData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WellCompletionService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Well Completion Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Optional realization to include. If not specified, all realizations will be returned.
     * @returns WellCompletionData Successful Response
     * @throws ApiError
     */
    public getWellCompletionData(
        caseUuid: string,
        ensembleName: string,
        realization?: number,
    ): CancelablePromise<WellCompletionData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well_completion/well_completion_data/',
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
