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
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getFieldWellTrajectories(
        caseUuid: string,
    ): CancelablePromise<Array<WellBoreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/field_well_trajectories/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Well Trajectory
     * Get well trajectory
     * @param wellboreUuid Wellbore uuid
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectory(
        wellboreUuid: string,
    ): CancelablePromise<WellBoreTrajectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectory/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
