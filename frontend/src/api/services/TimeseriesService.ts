/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnsembleScalarResponse } from '../models/EnsembleScalarResponse';
import type { Frequency } from '../models/Frequency';
import type { StatisticFunction } from '../models/StatisticFunction';
import type { VectorDescription } from '../models/VectorDescription';
import type { VectorHistoricalData } from '../models/VectorHistoricalData';
import type { VectorMetadata } from '../models/VectorMetadata';
import type { VectorRealizationData } from '../models/VectorRealizationData';
import type { VectorStatisticData } from '../models/VectorStatisticData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TimeseriesService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Vector Names And Descriptions
     * Get all vector names and descriptive names in a given Sumo ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param excludeAllValuesZero Exclude all vectors where all values are zero
     * @param excludeAllValuesConstant Exclude all vectors where all values are the same value
     * @returns VectorDescription Successful Response
     * @throws ApiError
     */
    public getVectorNamesAndDescriptions(
        caseUuid: string,
        ensembleName: string,
        excludeAllValuesZero: boolean = false,
        excludeAllValuesConstant: boolean = false,
    ): CancelablePromise<Array<VectorDescription>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/vector_names_and_description/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'exclude_all_values_zero': excludeAllValuesZero,
                'exclude_all_values_constant': excludeAllValuesConstant,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Realizations Vector Data
     * Get vector data per realization
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency. If not specified, raw data without resampling wil be returned.
     * @param realizations Optional list of realizations to include. If not specified, all realizations will be returned.
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorRealizationData Successful Response
     * @throws ApiError
     */
    public getRealizationsVectorData(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        resamplingFrequency?: Frequency,
        realizations?: Array<number>,
        relativeToTimestamp?: string,
    ): CancelablePromise<Array<VectorRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realizations_vector_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
                'resampling_frequency': resamplingFrequency,
                'realizations': realizations,
                'relative_to_timestamp': relativeToTimestamp,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Vector Metadata
     * Get metadata for the specified vector. Returns None if no metadata
     * exists or if any of the non-optional properties of `VectorMetadata` are missing.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @returns VectorMetadata Successful Response
     * @throws ApiError
     */
    public getVectorMetadata(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
    ): CancelablePromise<VectorMetadata> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/vector_metadata/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Timesteps
     * Get the intersection of available timesteps.
     * Note that when resampling_frequency is None, the pure intersection of the
     * stored raw dates will be returned. Thus the returned list of dates will not include
     * dates from long running realizations.
     * For other resampling frequencies, the date range will be expanded to cover the entire
     * time range of all the requested realizations before computing the resampled dates.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param resamplingFrequency Resampling frequency
     * @returns string Successful Response
     * @throws ApiError
     */
    public getTimesteps(
        caseUuid: string,
        ensembleName: string,
        resamplingFrequency?: Frequency,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/timesteps/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'resampling_frequency': resamplingFrequency,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Historical Vector Data
     * @param caseUuid Sumo case uuid
     * @param nonHistoricalVectorName Name of the non-historical vector
     * @param resamplingFrequency Resampling frequency
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorHistoricalData Successful Response
     * @throws ApiError
     */
    public getHistoricalVectorData(
        caseUuid: string,
        nonHistoricalVectorName: string,
        resamplingFrequency?: Frequency,
        relativeToTimestamp?: string,
    ): CancelablePromise<VectorHistoricalData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/historical_vector_data/',
            query: {
                'case_uuid': caseUuid,
                'non_historical_vector_name': nonHistoricalVectorName,
                'resampling_frequency': resamplingFrequency,
                'relative_to_timestamp': relativeToTimestamp,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Statistical Vector Data
     * Get statistical vector data for an ensemble
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency
     * @param statisticFunctions Optional list of statistics to calculate. If not specified, all statistics will be calculated.
     * @param realizations Optional list of realizations to include. If not specified, all realizations will be included.
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorStatisticData Successful Response
     * @throws ApiError
     */
    public getStatisticalVectorData(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        resamplingFrequency: Frequency,
        statisticFunctions?: Array<StatisticFunction>,
        realizations?: Array<number>,
        relativeToTimestamp?: string,
    ): CancelablePromise<VectorStatisticData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/statistical_vector_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
                'resampling_frequency': resamplingFrequency,
                'statistic_functions': statisticFunctions,
                'realizations': realizations,
                'relative_to_timestamp': relativeToTimestamp,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Realizations Calculated Vector Data
     * Get calculated vector data per realization
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param expression
     * @param variableNames
     * @param vectorNames
     * @param resamplingFrequency Resampling frequency
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns string Successful Response
     * @throws ApiError
     */
    public getRealizationsCalculatedVectorData(
        caseUuid: string,
        ensembleName: string,
        expression: string,
        variableNames: string,
        vectorNames: string,
        resamplingFrequency?: Frequency,
        relativeToTimestamp?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realizations_calculated_vector_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'resampling_frequency': resamplingFrequency,
                'relative_to_timestamp': relativeToTimestamp,
                'expression': expression,
                'variable_names': variableNames,
                'vector_names': vectorNames,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Realization Vector At Timestep
     * Get parameter correlations for a timeseries at a given timestep
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param timestep Timestep
     * @returns EnsembleScalarResponse Successful Response
     * @throws ApiError
     */
    public getRealizationVectorAtTimestep(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        timestep: string,
    ): CancelablePromise<EnsembleScalarResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realization_vector_at_timestep/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
                'timestep': timestep,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
