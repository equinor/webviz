/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Frequency } from '../models/Frequency';
import type { GroupTreeData } from '../models/GroupTreeData';
import type { StatOption } from '../models/StatOption';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class GroupTreeService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get Realization Group Tree Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @param resamplingFrequency Resampling frequency. If not specified, yearly data will be used.
     * @returns GroupTreeData Successful Response
     * @throws ApiError
     */
    public getRealizationGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        realization: number,
        resamplingFrequency?: (Frequency | null),
    ): CancelablePromise<GroupTreeData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/realization_group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
                'resampling_frequency': resamplingFrequency,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Statistical Group Tree Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param statOption Statistical option
     * @param resamplingFrequency Resampling frequency. If not specified, yearly data will be used.
     * @returns any Successful Response
     * @throws ApiError
     */
    public getStatisticalGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        statOption: StatOption,
        resamplingFrequency?: (Frequency | null),
    ): CancelablePromise<Array<any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/statistical_group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'stat_option': statOption,
                'resampling_frequency': resamplingFrequency,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
