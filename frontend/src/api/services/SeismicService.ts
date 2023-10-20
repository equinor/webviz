/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_get_fence } from '../models/Body_get_fence';
import type { SeismicCubeMeta } from '../models/SeismicCubeMeta';
import type { SeismicFenceData } from '../models/SeismicFenceData';

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
     * Get a fence of seismic data from a polyline defined by a set of (x, y) coordinates in domain coordinate system.
     *
     * The fence data contains a set of traces perpendicular to the polyline, with one trace per (x, y)-point in polyline.
     * Each trace has number of samples equal length, and is a set of values along the height/depth axis of the fence.
     *
     * The returned data
     * * fence_traces_b64arr: The fence trace array is base64 encoded 1D float array - where data is stored trace by trace. Decoding info: [num_traces, num_trace_samples]
     * * num_traces: Number of traces in fence array
     * * num_trace_samples: Number of samples in each trace
     * * min_fence_depth: The minimum depth value of the fence.
     * * max_fence_depth: The maximum depth value of the fence.
     *
     * TODO: Replace time_or_interval_str with time_or_interval: schemas.TimeOrInterval?
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
    public getFence(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicAttribute: string,
        timeOrIntervalStr: string,
        observed: boolean,
        requestBody: Body_get_fence,
    ): CancelablePromise<SeismicFenceData> {
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
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
