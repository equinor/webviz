/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellBoreHeader } from '../models/WellBoreHeader';
import type { WellBoreTrajectory } from '../models/WellBoreTrajectory';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WellService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Well Headers
     * Get well headers for all wells in the field
     * @param caseUuid Sumo case uuid
     * @returns WellBoreHeader Successful Response
     * @throws ApiError
     */
    public getWellHeaders(
        caseUuid: string,
    ): CancelablePromise<Array<WellBoreHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_headers/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Field Well Trajectories
     * Get well trajectories for field
     * @param caseUuid Sumo case uuid
     * @param uniqueWellboreIdentifiers Optional subset of well names
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getFieldWellTrajectories(
        caseUuid: string,
        uniqueWellboreIdentifiers?: Array<string>,
    ): CancelablePromise<Array<WellBoreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/field_well_trajectories/',
            query: {
                'case_uuid': caseUuid,
                'unique_wellbore_identifiers': uniqueWellboreIdentifiers,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Well Trajectories
     * Get well trajectories
     * @param wellboreUuids Wellbore uuids
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectories(
        wellboreUuids: Array<string>,
    ): CancelablePromise<Array<WellBoreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectories/',
            query: {
                'wellbore_uuids': wellboreUuids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
