/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_get_result_data_per_realization } from '../models/Body_get_result_data_per_realization';
import type { Body_post_get_aggregated_table_data } from '../models/Body_post_get_aggregated_table_data';
import type { FluidZone } from '../models/FluidZone';
import type { InplaceVolumetricData } from '../models/InplaceVolumetricData';
import type { InplaceVolumetricResultName } from '../models/InplaceVolumetricResultName';
import type { InplaceVolumetricsTableDefinition } from '../models/InplaceVolumetricsTableDefinition';
import type { InplaceVolumetricTableDataPerFluidSelection } from '../models/InplaceVolumetricTableDataPerFluidSelection';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class InplaceVolumetricsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Definitions
     * Get the volumetric tables definitions for a given ensemble.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns InplaceVolumetricsTableDefinition Successful Response
     * @throws ApiError
     */
    public getTableDefinitions(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<InplaceVolumetricsTableDefinition>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/inplace_volumetrics/table_definitions/',
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
        resultName: InplaceVolumetricResultName,
        realizations: Array<number>,
        requestBody: Body_get_result_data_per_realization,
    ): CancelablePromise<InplaceVolumetricData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/result_data_per_realization/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'result_name': resultName,
                'realizations': realizations,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Post Get Aggregated Table Data
     * Get aggregated volumetric data for a given table, results and categories/index filter.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param resultNames The name of the volumetric results
     * @param fluidZones The fluid zones to aggregate by
     * @param accumulateFluidZones Whether to accumulate fluid zones
     * @param calculateMeanAcrossRealizations Whether to calculate mean across realizations
     * @param requestBody
     * @param realizations Optional realization to include. If not specified, all realizations will be returned.
     * @returns InplaceVolumetricTableDataPerFluidSelection Successful Response
     * @throws ApiError
     */
    public postGetAggregatedTableData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        resultNames: Array<string>,
        fluidZones: Array<FluidZone>,
        accumulateFluidZones: boolean,
        calculateMeanAcrossRealizations: boolean,
        requestBody: Body_post_get_aggregated_table_data,
        realizations?: (Array<number> | null),
    ): CancelablePromise<InplaceVolumetricTableDataPerFluidSelection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/get_aggregated_table_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'result_names': resultNames,
                'fluid_zones': fluidZones,
                'realizations': realizations,
                'accumulate_fluid_zones': accumulateFluidZones,
                'calculate_mean_across_realizations': calculateMeanAcrossRealizations,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
