/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
import type { Frequency } from '../models/Frequency';
import type { StatisticFunction } from '../models/StatisticFunction';

export class GroupTreeService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Group Tree Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Optional realization to include. If not specified, all realizations will be returned.
     * @returns any Successful Response
     * @throws ApiError
     */
    public getRealizationGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        realization: number | undefined,
        resamplingFrequency?: (Frequency | null),
    ): CancelablePromise<Array<any>> {
        console.log(realization)
        console.log(resamplingFrequency)
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/realization_group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
                'resampling_frequency': resamplingFrequency
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    public getStatisticalGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        statOption: StatisticFunction,
        resamplingFrequency?: (Frequency | null),
    ): CancelablePromise<Array<any>> {
        console.log(statOption)
        console.log(resamplingFrequency)
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/statistical_group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'stat_option': statOption,
                'resampling_frequency': resamplingFrequency
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
