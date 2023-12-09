/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_post_get_seismic_fence } from '../models/Body_post_get_seismic_fence';
import type { SeismicCubeMeta } from '../models/SeismicCubeMeta';
import type { SeismicFenceData } from '../models/SeismicFenceData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SeismicService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Seismic Cube Meta List
     * Get a list of seismic cube meta.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SeismicCubeMeta Successful Response
     * @throws ApiError
     */
    public getSeismicCubeMetaList(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<SeismicCubeMeta>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/seismic_cube_meta_list/',
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
     * Post Get Seismic Fence
     * Get a fence of seismic data from a polyline defined by a set of (x, y) coordinates in domain coordinate system.
     *
     * The fence data contains a set of traces perpendicular to the polyline, with one trace per (x, y)-point in polyline.
     * Each trace has equal number of samples, and is a set of sample values along the depth direction of the seismic cube.
     *
     * Returns:
     * A SeismicFenceData object with fence traces in encoded 1D array, metadata for trace array decoding and fence min/max depth.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param seismicAttribute Seismic cube attribute
     * @param timeOrIntervalStr Timestamp or timestep
     * @param observed Observed or simulated
     * @param requestBody
     * @returns SeismicFenceData Successful Response
     * @throws ApiError
     */
    public postGetSeismicFence(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicAttribute: string,
        timeOrIntervalStr: string,
        observed: boolean,
        requestBody: Body_post_get_seismic_fence,
    ): CancelablePromise<SeismicFenceData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/seismic/get_seismic_fence/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'seismic_attribute': seismicAttribute,
                'time_or_interval_str': timeOrIntervalStr,
                'observed': observed,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
