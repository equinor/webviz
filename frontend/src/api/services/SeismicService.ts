/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SeismicCubeMeta } from '../models/SeismicCubeMeta';
import type { SeismicIntersectionData } from '../models/SeismicIntersectionData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SeismicService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Seismic Directory
     * Get a directory of seismic cubes.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SeismicCubeMeta Successful Response
     * @throws ApiError
     */
    public getSeismicDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<SeismicCubeMeta>> {
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

    /**
     * Get Fence
     * Get a fence of seismic data from a set of coordinates.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param seismicAttribute Seismic cube attribute
     * @param timeOrIntervalStr Timestamp or timestep
     * @param observed Observed or simulated
     * @returns SeismicIntersectionData Successful Response
     * @throws ApiError
     */
    public getFence(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicAttribute: string,
        timeOrIntervalStr: string,
        observed: boolean,
    ): CancelablePromise<SeismicIntersectionData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/seismic/fence/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'seismic_attribute': seismicAttribute,
                'time_or_interval_str': timeOrIntervalStr,
                'observed': observed,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
