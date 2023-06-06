/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SeismicCubeSchema } from '../models/SeismicCubeSchema';
import type { SurfaceMeshAndProperty } from '../models/SurfaceMeshAndProperty';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SeismicService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Seismic Cube Directory
     * Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SeismicCubeSchema Successful Response
     * @throws ApiError
     */
    public getSeismicCubeDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<SeismicCubeSchema>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/seismic/seismic_cube_directory/',
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
     * @returns SurfaceMeshAndProperty Successful Response
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
    ): CancelablePromise<SurfaceMeshAndProperty> {
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

}
