/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PolygonData } from '../models/PolygonData';
import type { SurfacePolygonDirectory } from '../models/SurfacePolygonDirectory';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class SurfacePolygonsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Surface Polygons Directory
     * Get a directory of surface polygon names and attributes
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns SurfacePolygonDirectory Successful Response
     * @throws ApiError
     */
    public getSurfacePolygonsDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<SurfacePolygonDirectory> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface_polygons/surface_polygons_directory/',
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
     * Get Surface Polygons Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @returns PolygonData Successful Response
     * @throws ApiError
     */
    public getSurfacePolygonsData(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
    ): CancelablePromise<Array<PolygonData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/surface_polygons/surface_polygons_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization_num': realizationNum,
                'name': name,
                'attribute': attribute,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
