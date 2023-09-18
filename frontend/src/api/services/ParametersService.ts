/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnsembleParameter } from '../models/EnsembleParameter';
import type { EnsembleParameterDescription } from '../models/EnsembleParameterDescription';
import type { EnsembleSensitivity } from '../models/EnsembleSensitivity';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ParametersService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Parameter Names And Description
     * Retrieve parameter names and description for an ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param excludeAllValuesConstant Exclude all parameters where all values are the same value
     * @param sortOrder Sort order
     * @returns EnsembleParameterDescription Successful Response
     * @throws ApiError
     */
    public getParameterNamesAndDescription(
        caseUuid: string,
        ensembleName: string,
        excludeAllValuesConstant: boolean = true,
        sortOrder: 'alphabetically' | 'standard_deviation' = 'alphabetically',
    ): CancelablePromise<Array<EnsembleParameterDescription>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/parameters/parameter_names_and_description/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'exclude_all_values_constant': excludeAllValuesConstant,
                'sort_order': sortOrder,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Parameter
     * Get a parameter in a given Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param parameterName Parameter name
     * @returns any Successful Response
     * @throws ApiError
     */
    public getParameter(
        caseUuid: string,
        ensembleName: string,
        parameterName: string,
    ): CancelablePromise<(EnsembleParameter | null)> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/parameters/parameter/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'parameter_name': parameterName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Parameters
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns EnsembleParameter Successful Response
     * @throws ApiError
     */
    public getParameters(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<EnsembleParameter>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/parameters/parameters/',
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
     * Is Sensitivity Run
     * Check if a given Sumo ensemble is a sensitivity run
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns boolean Successful Response
     * @throws ApiError
     */
    public isSensitivityRun(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<boolean> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/parameters/is_sensitivity_run/',
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
     * Get Sensitivities
     * Get sensitivities in a given Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns EnsembleSensitivity Successful Response
     * @throws ApiError
     */
    public getSensitivities(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<EnsembleSensitivity>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/parameters/sensitivities/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
