/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PolygonData } from '../models/PolygonData';
import type { PolygonsMeta } from '../models/PolygonsMeta';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class PolygonsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Polygons Directory
     * Get a directory of polygons in a Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns PolygonsMeta Successful Response
     * @throws ApiError
     */
    public getPolygonsDirectory(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<PolygonsMeta>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/polygons/polygons_directory/',
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
     * Get Polygons Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realizationNum Realization number
     * @param name Surface name
     * @param attribute Surface attribute
     * @returns PolygonData Successful Response
     * @throws ApiError
     */
    public getPolygonsData(
        caseUuid: string,
        ensembleName: string,
        realizationNum: number,
        name: string,
        attribute: string,
    ): CancelablePromise<Array<PolygonData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/polygons/polygons_data/',
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
