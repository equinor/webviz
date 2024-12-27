/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GraphUserPhoto } from '../models/GraphUserPhoto';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class GraphService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * User Info
     * Get username, display name and avatar from Microsoft Graph API for a given user id
     * @param userId User id
     * @returns GraphUserPhoto Successful Response
     * @throws ApiError
     */
    public userInfo(
        userId: string,
    ): CancelablePromise<GraphUserPhoto> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/graph/user_photo/',
            query: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
