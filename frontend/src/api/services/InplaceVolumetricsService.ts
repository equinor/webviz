/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_post_get_aggregated_per_realization_table_data } from '../models/Body_post_get_aggregated_per_realization_table_data';
import type { Body_post_get_aggregated_statistical_table_data } from '../models/Body_post_get_aggregated_statistical_table_data';
import type { FluidZone } from '../models/FluidZone';
import type { InplaceStatisticalVolumetricTableDataPerFluidSelection } from '../models/InplaceStatisticalVolumetricTableDataPerFluidSelection';
import type { InplaceVolumetricsIdentifier } from '../models/InplaceVolumetricsIdentifier';
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
     * Post Get Aggregated Per Realization Table Data
     * Get aggregated volumetric data for a given table with data per realization based on requested results and categories/index filter.
     *
     * Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
     * As the endpoint is post, the identifiers with values object is kept for convenience.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param resultNames The name of the volumetric results
     * @param fluidZones The fluid zones to aggregate by
     * @param accumulateFluidZones Whether to accumulate fluid zones
     * @param requestBody
     * @param groupByIdentifiers The identifiers to group table data by
     * @param realizations Optional list of realizations to include. If not specified, all realizations will be returned.
     * @returns InplaceVolumetricTableDataPerFluidSelection Successful Response
     * @throws ApiError
     */
    public postGetAggregatedPerRealizationTableData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        resultNames: Array<string>,
        fluidZones: Array<FluidZone>,
        accumulateFluidZones: boolean,
        requestBody: Body_post_get_aggregated_per_realization_table_data,
        groupByIdentifiers?: (Array<InplaceVolumetricsIdentifier> | null),
        realizations?: (Array<number> | null),
    ): CancelablePromise<InplaceVolumetricTableDataPerFluidSelection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/get_aggregated_per_realization_table_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'result_names': resultNames,
                'fluid_zones': fluidZones,
                'accumulate_fluid_zones': accumulateFluidZones,
                'group_by_identifiers': groupByIdentifiers,
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
     * Post Get Aggregated Statistical Table Data
     * Get statistical volumetric data across selected realizations for a given table based on requested results and categories/index filter.
     *
     * Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
     * As the endpoint is post, the identifiers with values object is kept for convenience.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param resultNames The name of the volumetric results
     * @param fluidZones The fluid zones to aggregate by
     * @param accumulateFluidZones Whether to accumulate fluid zones
     * @param requestBody
     * @param groupByIdentifiers The identifiers to group table data by
     * @param realizations Optional list of realizations to include. If not specified, all realizations will be returned.
     * @returns InplaceStatisticalVolumetricTableDataPerFluidSelection Successful Response
     * @throws ApiError
     */
    public postGetAggregatedStatisticalTableData(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        resultNames: Array<string>,
        fluidZones: Array<FluidZone>,
        accumulateFluidZones: boolean,
        requestBody: Body_post_get_aggregated_statistical_table_data,
        groupByIdentifiers?: (Array<InplaceVolumetricsIdentifier> | null),
        realizations?: (Array<number> | null),
    ): CancelablePromise<InplaceStatisticalVolumetricTableDataPerFluidSelection> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/get_aggregated_statistical_table_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'result_names': resultNames,
                'fluid_zones': fluidZones,
                'accumulate_fluid_zones': accumulateFluidZones,
                'group_by_identifiers': groupByIdentifiers,
                'realizations': realizations,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
