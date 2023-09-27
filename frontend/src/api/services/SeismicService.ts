/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SeismicMeta } from '../models/SeismicMeta';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SeismicService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Seismic Directory
     * Get a directory of seismic cubes.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SeismicMeta Successful Response
     * @throws ApiError
     */
    public getSeismicDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<SeismicMeta>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/seismic_directory/',
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
