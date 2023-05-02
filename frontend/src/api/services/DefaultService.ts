/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserInfo } from '../models/UserInfo';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DefaultService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     *  Login Route
     * @param redirectUrlAfterLogin
     * @returns any Successful Response
     * @throws ApiError
     */
    public loginRoute(
        redirectUrlAfterLogin?: string,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/login',
            query: {
                'redirect_url_after_login': redirectUrlAfterLogin,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     *  Authorized Callback Route
     * @returns any Successful Response
     * @throws ApiError
     */
    public authorizedCallbackRoute(): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth-callback',
        });
    }

    /**
     * Alive
     * @returns string Successful Response
     * @throws ApiError
     */
    public alive(): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/alive',
        });
    }

    /**
     * Alive Protected
     * @returns string Successful Response
     * @throws ApiError
     */
    public aliveProtected(): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/alive_protected',
        });
    }

    /**
     * Logged In User
     * @returns UserInfo Successful Response
     * @throws ApiError
     */
    public loggedInUser(): CancelablePromise<UserInfo> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/logged_in_user',
        });
    }

    /**
     * Root
     * @returns string Successful Response
     * @throws ApiError
     */
    public root(): CancelablePromise<string> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/',
        });
    }

}
