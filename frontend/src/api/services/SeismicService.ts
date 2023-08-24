/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Seismic3DSurveyDirectory } from '../models/Seismic3DSurveyDirectory';
import type { Seismic4DSurveyDirectory } from '../models/Seismic4DSurveyDirectory';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SeismicService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Seismic 3Dsurvey Directory
     * Get a directory of seismic 3D surveys.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns Seismic3DSurveyDirectory Successful Response
     * @throws ApiError
     */
    public getSeismic3DsurveyDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Seismic3DSurveyDirectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/seismic_3dsurvey_directory/',
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
     * Get Seismic 4Dsurvey Directory
     * Get a directory of seismic 4D surveys.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns Seismic4DSurveyDirectory Successful Response
     * @throws ApiError
     */
    public getSeismic4DsurveyDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Seismic4DSurveyDirectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/seismic_4dsurvey_directory/',
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
     * Get Seismic Attribute Near Surface
     * Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param seismicCubeAttribute Seismic cube attribute
     * @param seismicTimestampOrTimestep Timestamp or timestep
     * @param surfaceName Surface name
     * @param surfaceAttribute Surface attribute
     * @returns any Successful Response
     * @throws ApiError
     */
    public getSeismicAttributeNearSurface(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicCubeAttribute: string,
        seismicTimestampOrTimestep: string,
        surfaceName: string,
        surfaceAttribute: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/get_seismic_attribute_near_surface/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'seismic_cube_attribute': seismicCubeAttribute,
                'seismic_timestamp_or_timestep': seismicTimestampOrTimestep,
                'surface_name': surfaceName,
                'surface_attribute': surfaceAttribute,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Slice
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param seismicCubeAttribute Seismic cube attribute
     * @param seismicTimeString Timestamp or timestep
     * @param direction Sumo case uuid
     * @param lineno Sumo case uuid
     * @returns any Successful Response
     * @throws ApiError
     */
    public getSlice(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicCubeAttribute: string,
        seismicTimeString: string,
        direction: string,
        lineno: number,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/get_slice/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'seismic_cube_attribute': seismicCubeAttribute,
                'seismic_time_string': seismicTimeString,
                'direction': direction,
                'lineno': lineno,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
