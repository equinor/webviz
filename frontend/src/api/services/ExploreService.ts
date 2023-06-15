/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CaseInfo } from '../models/CaseInfo';
import type { EnsembleDetails } from '../models/EnsembleDetails';
import type { EnsembleInfo } from '../models/EnsembleInfo';
import type { FieldInfo } from '../models/FieldInfo';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ExploreService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Fields
     * Get list of fields
     * @returns FieldInfo Successful Response
     * @throws ApiError
     */
    public getFields(): CancelablePromise<Array<FieldInfo>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/fields',
        });
    }

    /**
     * Get Cases
     * Get list of cases for specified field
     * @param fieldIdentifier Field identifier
     * @returns CaseInfo Successful Response
     * @throws ApiError
     */
    public getCases(
        fieldIdentifier: string,
    ): CancelablePromise<Array<CaseInfo>> {
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
     * @returns EnsembleInfo Successful Response
     * @throws ApiError
     */
    public getEnsembles(
        caseUuid: string,
    ): CancelablePromise<Array<EnsembleInfo>> {
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

    /**
     * Get Ensemble Details
     * Get more detailed information for an ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns EnsembleDetails Successful Response
     * @throws ApiError
     */
    public getEnsembleDetails(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<EnsembleDetails> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/cases/{case_uuid}/ensembles/{ensemble_name}',
            path: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
