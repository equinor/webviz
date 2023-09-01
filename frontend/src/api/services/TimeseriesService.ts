/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnsembleScalarResponse } from '../models/EnsembleScalarResponse';
import type { Frequency } from '../models/Frequency';
import type { StatisticFunction } from '../models/StatisticFunction';
import type { VectorDescription } from '../models/VectorDescription';
import type { VectorHistoricalData } from '../models/VectorHistoricalData';
import type { VectorRealizationData } from '../models/VectorRealizationData';
import type { VectorStatisticData } from '../models/VectorStatisticData';
import type { VectorStatisticSensitivityData } from '../models/VectorStatisticSensitivityData';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TimeseriesService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Vector List
     * Get list of all vectors in a given Sumo ensemble, excluding any historical vectors
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns VectorDescription Successful Response
     * @throws ApiError
     */
    public getVectorList(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<VectorDescription>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/vector_list/',
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
     * Get Realizations Vector Data
     * Get vector data per realization
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency. If not specified, raw data without resampling wil be returned.
     * @param realizations Optional list of realizations to include. If not specified, all realizations will be returned.
     * @returns VectorRealizationData Successful Response
     * @throws ApiError
     */
    public getRealizationsVectorData(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        resamplingFrequency?: Frequency,
        realizations?: Array<number>,
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
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Timestamps List
     * Get the intersection of available timestamps.
     * Note that when resampling_frequency is None, the pure intersection of the
     * stored raw dates will be returned. Thus the returned list of dates will not include
     * dates from long running realizations.
     * For other resampling frequencies, the date range will be expanded to cover the entire
     * time range of all the requested realizations before computing the resampled dates.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param resamplingFrequency Resampling frequency
     * @returns number Successful Response
     * @throws ApiError
     */
    public getTimestampsList(
        caseUuid: string,
        ensembleName: string,
        resamplingFrequency?: Frequency,
    ): CancelablePromise<Array<number>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/timestamps_list/',
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
     * @param ensembleName Ensemble name
     * @param nonHistoricalVectorName Name of the non-historical vector
     * @param resamplingFrequency Resampling frequency
     * @returns VectorHistoricalData Successful Response
     * @throws ApiError
     */
    public getHistoricalVectorData(
        caseUuid: string,
        ensembleName: string,
        nonHistoricalVectorName: string,
        resamplingFrequency?: Frequency,
    ): CancelablePromise<VectorHistoricalData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/historical_vector_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'non_historical_vector_name': nonHistoricalVectorName,
                'resampling_frequency': resamplingFrequency,
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
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Statistical Vector Data Per Sensitivity
     * Get statistical vector data for an ensemble per sensitivity
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param resamplingFrequency Resampling frequency
     * @param statisticFunctions Optional list of statistics to calculate. If not specified, all statistics will be calculated.
     * @returns VectorStatisticSensitivityData Successful Response
     * @throws ApiError
     */
    public getStatisticalVectorDataPerSensitivity(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        resamplingFrequency: Frequency,
        statisticFunctions?: Array<StatisticFunction>,
    ): CancelablePromise<Array<VectorStatisticSensitivityData>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/statistical_vector_data_per_sensitivity/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
                'resampling_frequency': resamplingFrequency,
                'statistic_functions': statisticFunctions,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Realization Vector At Timestamp
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param timestampUtcMs Timestamp in ms UTC to query vectors at
     * @returns EnsembleScalarResponse Successful Response
     * @throws ApiError
     */
    public getRealizationVectorAtTimestamp(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        timestampUtcMs: number,
    ): CancelablePromise<EnsembleScalarResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/timeseries/realization_vector_at_timestamp/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'vector_name': vectorName,
                'timestamp_utc_ms': timestampUtcMs,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
