/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GridIntersectionVtk } from '../models/GridIntersectionVtk';
import type { GridSurface } from '../models/GridSurface';
import type { GridSurfaceVtk } from '../models/GridSurfaceVtk';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class Grid3DService {
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
            url: '/grid3d/grid_model_names/',
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
            url: '/grid3d/parameter_names/',
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
            url: '/grid3d/grid_surface',
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
            url: '/grid3d/grid_parameter',
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
     * Grid Surface Vtk
     * Get a grid
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param realization Realization
     * @returns GridSurfaceVtk Successful Response
     * @throws ApiError
     */
    public gridSurfaceVtk(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        realization: string,
    ): CancelablePromise<GridSurfaceVtk> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_surface_vtk',
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
     * Grid Parameter Vtk
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realization Realization
     * @returns number Successful Response
     * @throws ApiError
     */
    public gridParameterVtk(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: string,
    ): CancelablePromise<Array<number>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_parameter_vtk',
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
     * Grid Parameter Intersection Vtk
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realization Realization
     * @returns GridIntersectionVtk Successful Response
     * @throws ApiError
     */
    public gridParameterIntersectionVtk(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realization: string,
    ): CancelablePromise<GridIntersectionVtk> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/grid_parameter_intersection_vtk',
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
     * Statistical Grid Parameter Intersection Vtk
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizations Realizations
     * @returns GridIntersectionVtk Successful Response
     * @throws ApiError
     */
    public statisticalGridParameterIntersectionVtk(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizations: Array<string>,
    ): CancelablePromise<GridIntersectionVtk> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/statistical_grid_parameter_intersection_vtk',
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
     * Statistical Grid Parameter Vtk
     * Get a grid parameter
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param gridName Grid name
     * @param parameterName Grid parameter
     * @param realizations Realizations
     * @returns number Successful Response
     * @throws ApiError
     */
    public statisticalGridParameterVtk(
        caseUuid: string,
        ensembleName: string,
        gridName: string,
        parameterName: string,
        realizations: Array<string>,
    ): CancelablePromise<Array<number>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid3d/statistical_grid_parameter_vtk',
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
