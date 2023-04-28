/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnsembleCorrelations } from '../models/EnsembleCorrelations';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class CorrelationsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Correlate Parameters With Timeseries
     * Get parameter correlations for a timeseries at a given timestep
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param vectorName Name of the vector
     * @param timestep Timestep
     * @returns EnsembleCorrelations Successful Response
     * @throws ApiError
     */
    public correlateParametersWithTimeseries(
        caseUuid: string,
        ensembleName: string,
        vectorName: string,
        timestep: string,
    ): CancelablePromise<EnsembleCorrelations> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/correlations/correlate_parameters_with_timeseries/',
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

    /**
     * Correlate Parameters With Inplace Volumes
     * Get parameter correlations for an inplace volumetrics response
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param responseName Response name
     * @returns EnsembleCorrelations Successful Response
     * @throws ApiError
     */
    public correlateParametersWithInplaceVolumes(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        responseName: string,
    ): CancelablePromise<EnsembleCorrelations> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/correlations/correlate_parameters_with_inplace_volumes/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'response_name': responseName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
