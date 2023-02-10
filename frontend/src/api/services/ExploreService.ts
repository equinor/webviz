/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Case } from '../models/Case';
import type { Ensemble } from '../models/Ensemble';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ExploreService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Cases
     * Get list of cases (currently only for Drogon)
     * @param fieldIdentifier Field identifier
     * @returns Case Successful Response
     * @throws ApiError
     */
    public getCases(
        fieldIdentifier: string,
    ): CancelablePromise<Array<Case>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/cases',
            query: {
                'field_identifier': fieldIdentifier,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Ensembles
     * Get list of ensembles for a case
     * @param caseUuid Sumo case uuid
     * @returns Ensemble Successful Response
     * @throws ApiError
     */
    public getEnsembles(
        caseUuid: string,
    ): CancelablePromise<Array<Ensemble>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/cases/{case_uuid}/ensembles',
            path: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
