/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_get_realizations_response } from '../models/Body_get_realizations_response';
import type { EnsembleScalarResponse } from '../models/EnsembleScalarResponse';
import type { InplaceVolumetricsTableMetaData } from '../models/InplaceVolumetricsTableMetaData';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class InplaceVolumetricsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Names And Descriptions
     * Get all volumetric tables for a given ensemble.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns InplaceVolumetricsTableMetaData Successful Response
     * @throws ApiError
     */
    public getTableNamesAndDescriptions(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<InplaceVolumetricsTableMetaData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/inplace_volumetrics/table_names_and_descriptions/',
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
     * Get Realizations Response
     * Get response for a given table and index filter.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param responseName Response name
     * @param requestBody
     * @returns EnsembleScalarResponse Successful Response
     * @throws ApiError
     */
    public getRealizationsResponse(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        responseName: string,
        requestBody?: Body_get_realizations_response,
    ): CancelablePromise<EnsembleScalarResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/realizations_response/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'response_name': responseName,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
