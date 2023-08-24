/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_get_grid_parameter } from '../models/Body_get_grid_parameter';
import type { Body_get_seismic } from '../models/Body_get_seismic';
import type { Body_get_surfaces } from '../models/Body_get_surfaces';
import type { CubeIntersectionData } from '../models/CubeIntersectionData';
import type { SurfaceIntersectionData } from '../models/SurfaceIntersectionData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class IntersectionService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Surfaces
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param names Surface names
     * @param attribute Surface attribute
     * @param requestBody
     * @returns SurfaceIntersectionData Successful Response
     * @throws ApiError
     */
    public getSurfaces(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        names: Array<string>,
        attribute: string,
        requestBody: Body_get_surfaces,
    ): CancelablePromise<Array<SurfaceIntersectionData>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/intersection/surfaces/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'names': names,
                'attribute': attribute,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Grid Parameter
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realization Realization
     * @param requestBody
     * @returns CubeIntersectionData Successful Response
     * @throws ApiError
     */
    public getGridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: number,
        requestBody: Body_get_grid_parameter,
    ): CancelablePromise<CubeIntersectionData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/intersection/grid_parameter/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realization': realization,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Seismic
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param seismicCubeAttribute Seismic cube attribute
     * @param seismicTimestampOrTimestep Timestamp or timestep
     * @param observed Observed or simulated
     * @param requestBody
     * @returns CubeIntersectionData Successful Response
     * @throws ApiError
     */
    public getSeismic(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        seismicCubeAttribute: string,
        seismicTimestampOrTimestep: string,
        observed: boolean,
        requestBody: Body_get_seismic,
    ): CancelablePromise<CubeIntersectionData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/intersection/seismic/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'seismic_cube_attribute': seismicCubeAttribute,
                'seismic_timestamp_or_timestep': seismicTimestampOrTimestep,
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
