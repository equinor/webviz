/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RftWellInfo } from '../models/RftWellInfo';
import type { RftWellRealizationData } from '../models/RftWellRealizationData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class RftService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Well List
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns RftWellInfo Successful Response
     * @throws ApiError
     */
    public getWellList(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<RftWellInfo>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rft/well_list',
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
     * @returns RftWellRealizationData Successful Response
     * @throws ApiError
     */
    public getRealizationData(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<RftWellRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/rft/realization_data',
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
