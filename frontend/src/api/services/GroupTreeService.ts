/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Frequency } from '../models/Frequency';
import type { GroupTreeData } from '../models/GroupTreeData';
import type { NodeType } from '../models/NodeType';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GroupTreeService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Realization Group Tree Data
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @param resamplingFrequency Resampling frequency
     * @param nodeTypeSet Node types
     * @returns GroupTreeData Successful Response
     * @throws ApiError
     */
    public getRealizationGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        realization: number,
        resamplingFrequency: Frequency,
        nodeTypeSet: Array<NodeType>,
    ): CancelablePromise<GroupTreeData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/realization_group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
                'resampling_frequency': resamplingFrequency,
                'node_type_set': nodeTypeSet,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
