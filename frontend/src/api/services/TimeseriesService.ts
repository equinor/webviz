/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Frequency } from '../models/Frequency';
import type { StatisticsOptions } from '../models/StatisticsOptions';
import type { VectorDescription } from '../models/VectorDescription';
import type { VectorHistoricalData } from '../models/VectorHistoricalData';
import type { VectorMetadata } from '../models/VectorMetadata';
import type { VectorRealizationData } from '../models/VectorRealizationData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TimeseriesService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Case Ids
     * Test function to get valid case ids
     * @returns string Successful Response
     * @throws ApiError
     */
    public getCaseIds(): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/case_ids/',
        });
    }

    /**
     * Get Vector Names And Descriptions
     * Get all vector names and descriptive names in a given Sumo ensemble
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param excludeAllValuesZero Exclude all vectors where all values are zero
     * @param excludeAllValuesConstant Exclude all vectors where all values are the same value
     * @returns VectorDescription Successful Response
     * @throws ApiError
     */
    public getVectorNamesAndDescriptions(
        sumoCaseId?: string,
        sumoIterationId?: string,
        excludeAllValuesZero: boolean = false,
        excludeAllValuesConstant: boolean = false,
    ): CancelablePromise<Array<VectorDescription>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/vector_names_and_description/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
                'exclude_all_values_zero': excludeAllValuesZero,
                'exclude_all_values_constant': excludeAllValuesConstant,
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
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param vectorName Sumo case id
     * @returns VectorMetadata Successful Response
     * @throws ApiError
     */
    public getVectorMetadata(
        sumoCaseId?: string,
        sumoIterationId?: string,
        vectorName?: string,
    ): CancelablePromise<VectorMetadata> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/vector_metadata/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
                'vector_name': vectorName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Timestamps
     * Get the intersection of available timestamps.
     * Note that when resampling_frequency is None, the pure intersection of the
     * stored raw dates will be returned. Thus the returned list of dates will not include
     * dates from long running realizations.
     * For other resampling frequencies, the date range will be expanded to cover the entire
     * time range of all the requested realizations before computing the resampled dates.
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param resamplingFrequency Resampling frequency
     * @param realizations Optional list of realizations to include
     * @returns string Successful Response
     * @throws ApiError
     */
    public getTimestamps(
        sumoCaseId?: string,
        sumoIterationId?: string,
        resamplingFrequency?: Frequency,
        realizations?: Array<number>,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/timestamps/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
                'resampling_frequency': resamplingFrequency,
                'realizations': realizations,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Historical Vector Data
     * @param sumoCaseId Sumo case id
     * @param nonHistoricalVectorName Name of the non-historical vector
     * @param resamplingFrequency Resampling frequency
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorHistoricalData Successful Response
     * @throws ApiError
     */
    public getHistoricalVectorData(
        sumoCaseId?: string,
        nonHistoricalVectorName?: string,
        resamplingFrequency?: Frequency,
        relativeToTimestamp?: string,
    ): CancelablePromise<VectorHistoricalData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/historical_vector_data/',
            query: {
                'sumo_case_id': sumoCaseId,
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
     * Get Realizations Vector Data
     * Get vector data per realization
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency
     * @param realizations Optional list of realizations to include
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorRealizationData Successful Response
     * @throws ApiError
     */
    public getRealizationsVectorData(
        sumoCaseId?: string,
        sumoIterationId?: string,
        vectorName?: string,
        resamplingFrequency?: Frequency,
        realizations?: Array<number>,
        relativeToTimestamp?: string,
    ): CancelablePromise<Array<VectorRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realizations_vector_data/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
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
     * Get Statistical Vector Data
     * Get statistical vector data for an ensemble
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param statistic Statistical calculations to apply
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency
     * @param realizations Optional list of realizations to include
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns VectorRealizationData Successful Response
     * @throws ApiError
     */
    public getStatisticalVectorData(
        sumoCaseId?: string,
        sumoIterationId?: string,
        statistic?: Array<StatisticsOptions>,
        vectorName?: string,
        resamplingFrequency?: Frequency,
        realizations?: Array<number>,
        relativeToTimestamp?: string,
    ): CancelablePromise<Array<VectorRealizationData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/statistical_vector_data/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
                'statistic': statistic,
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
     * Get Realizations Calculated Vector Data
     * Get calculated vector data per realization
     * @param expression
     * @param variableNames
     * @param vectorNames
     * @param sumoCaseId Sumo case id
     * @param sumoIterationId Sumo iteration id
     * @param resamplingFrequency Resampling frequency
     * @param relativeToTimestamp Calculate relative to timestamp
     * @returns string Successful Response
     * @throws ApiError
     */
    public getRealizationsCalculatedVectorData(
        expression: string,
        variableNames: string,
        vectorNames: string,
        sumoCaseId?: string,
        sumoIterationId?: string,
        resamplingFrequency?: Frequency,
        relativeToTimestamp?: string,
    ): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realizations_calculated_vector_data/',
            query: {
                'sumo_case_id': sumoCaseId,
                'sumo_iteration_id': sumoIterationId,
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

}
