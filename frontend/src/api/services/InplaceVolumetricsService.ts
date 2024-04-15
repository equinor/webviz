/* generated using openapi-typescript-codegen -- do no edit */

/* istanbul ignore file */

/* tslint:disable */

/* eslint-disable */
import type { BaseHttpRequest } from "../core/BaseHttpRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import type { Body_get_result_data_per_realization } from "../models/Body_get_result_data_per_realization";
import type { InplaceVolumetricData } from "../models/InplaceVolumetricData";
import type { InplaceVolumetricResponseNames } from "../models/InplaceVolumetricResponseNames";
import type { InplaceVolumetricTableDefinition } from "../models/InplaceVolumetricTableDefinition";

export class InplaceVolumetricsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Definitions
     * Get the volumetric tables definitions for a given ensemble.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns InplaceVolumetricTableDefinition Successful Response
     * @throws ApiError
     */
    public getTableDefinitions(
        caseUuid: string,
        ensembleName: string
    ): CancelablePromise<Array<InplaceVolumetricTableDefinition>> {
        return this.httpRequest.request({
            method: "GET",
            url: "/inplace_volumetrics/table_definitions/",
            query: {
                case_uuid: caseUuid,
                ensemble_name: ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Result Data Per Realization
     * Get volumetric data summed per realization for a given table, result and categories/index filter.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param resultName The name of the volumetric result/response
     * @param realizations Realizations
     * @param requestBody
     * @returns InplaceVolumetricData Successful Response
     * @throws ApiError
     */
    public getResultDataPerRealization(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        resultName: InplaceVolumetricResponseNames,
        realizations: Array<number>,
        requestBody: Body_get_result_data_per_realization
    ): CancelablePromise<InplaceVolumetricData> {
        return this.httpRequest.request({
            method: "POST",
            url: "/inplace_volumetrics/result_data_per_realization/",
            query: {
                case_uuid: caseUuid,
                ensemble_name: ensembleName,
                table_name: tableName,
                result_name: resultName,
                realizations: realizations,
            },
            body: requestBody,
            mediaType: "application/json",
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
