/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FlowNetworkData } from '../models/FlowNetworkData';
import type { Frequency } from '../models/Frequency';
import type { NodeType } from '../models/NodeType';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class FlowNetworkService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Realization Flow Network
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param realization Realization
     * @param resamplingFrequency Resampling frequency
     * @param nodeTypeSet Node types
     * @returns FlowNetworkData Successful Response
     * @throws ApiError
     */
    public getRealizationFlowNetwork(
        caseUuid: string,
        ensembleName: string,
        realization: number,
        resamplingFrequency: Frequency,
        nodeTypeSet: Array<NodeType>,
    ): CancelablePromise<FlowNetworkData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/flow_network/realization_flow_network/',
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
