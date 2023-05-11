/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { B64EncodedNumpyArray } from '../models/B64EncodedNumpyArray';
import type { GridGeometry } from '../models/GridGeometry';

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
     * Grid Geometry
     * Get a grid
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param realization Realization
     * @returns GridGeometry Successful Response
     * @throws ApiError
     */
    public gridGeometry(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        realization: string,
    ): CancelablePromise<GridGeometry> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_geometry',
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
     * @returns B64EncodedNumpyArray Successful Response
     * @throws ApiError
     */
    public gridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: string,
    ): CancelablePromise<B64EncodedNumpyArray> {
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
     * Statistical Grid Parameter
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizations Realizations
     * @returns B64EncodedNumpyArray Successful Response
     * @throws ApiError
     */
    public statisticalGridParameter(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizations: Array<string>,
    ): CancelablePromise<B64EncodedNumpyArray> {
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
