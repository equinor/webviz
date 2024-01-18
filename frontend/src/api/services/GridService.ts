/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GridIntersection } from '../models/GridIntersection';
import type { GridSurface } from '../models/GridSurface';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GridService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Grid Model Names
     * Get a list of grid model names
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns string Successful Response
     * @throws ApiError
     */
    public getGridModelNames(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_model_names/',
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
     * Get Parameter Names
     * Get a list of grid parameter names
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @returns string Successful Response
     * @throws ApiError
     */
    public getParameterNames(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/parameter_names/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grid Surface
     * Get a grid
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param realization Realization
     * @returns GridSurface Successful Response
     * @throws ApiError
     */
    public gridSurface(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        realization: string,
    ): CancelablePromise<GridSurface> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_surface',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'realization': realization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grid Parameter
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realization Realization
     * @returns number Successful Response
     * @throws ApiError
     */
    public gridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: string,
    ): CancelablePromise<Array<number>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_parameter',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realization': realization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Grid Parameter Intersection
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realization Realization
     * @returns GridIntersection Successful Response
     * @throws ApiError
     */
    public gridParameterIntersection(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: string,
    ): CancelablePromise<GridIntersection> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_parameter_intersection',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realization': realization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Statistical Grid Parameter Intersection
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizations Realizations
     * @returns GridIntersection Successful Response
     * @throws ApiError
     */
    public statisticalGridParameterIntersection(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizations: Array<string>,
    ): CancelablePromise<GridIntersection> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/statistical_grid_parameter_intersection',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realizations': realizations,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Statistical Grid Parameter
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizations Realizations
     * @returns number Successful Response
     * @throws ApiError
     */
    public statisticalGridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizations: Array<string>,
    ): CancelablePromise<Array<number>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/statistical_grid_parameter',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'grid_name': gridName,
                'parameter_name': parameterName,
                'realizations': realizations,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
