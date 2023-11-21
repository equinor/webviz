/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

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
    public getGroupTreeData(
        caseUuid: string,
        ensembleName: string,
        realization?: (number | null),
    ): CancelablePromise<Array<any>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/group_tree/group_tree_data/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'realization': realization,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
