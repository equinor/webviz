import type { UserInfo_api } from "@api";
import { getLoggedInUser } from "@api";
import type { Client } from "@api/client";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import { SKIP_AUTH_GUARD_META } from "./authInterceptors";

export enum AuthState {
    LoggedIn = "LoggedIn",
    NotLoggedIn = "NotLoggedIn",
    Loading = "Loading",
}

export enum AuthStateStoreTopic {
    AUTH_STATE = "AuthState",
    USER_INFO = "UserInfo",
}

export type AuthStateStoreTopicPayloads = {
    [AuthStateStoreTopic.AUTH_STATE]: AuthState;
    [AuthStateStoreTopic.USER_INFO]: UserInfo_api | null;
};

/**
 * Holds the auth state for code outside of React, e.g. HTTP interceptors and background pollers.
 * Updated synchronously, so a logout is visible immediately, without waiting for a re-render.
 * React components read it through the hooks in ./hooks.
 *
 * A singleton, since what it guards is global as well: the interceptors are installed on the global API client.
 *
 * Note: NotLoggedIn is final for the lifetime of the page - signing in again redirects and reloads the app.
 */
export class AuthStateStore implements PublishSubscribe<AuthStateStoreTopicPayloads> {
    private static _instance: AuthStateStore | null = null;
    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<AuthStateStoreTopicPayloads>();
    private _authState: AuthState = AuthState.Loading;
    private _userInfo: UserInfo_api | null = null;

    private constructor() {}

    static getInstance(): AuthStateStore {
        if (!AuthStateStore._instance) {
            AuthStateStore._instance = new AuthStateStore();
        }
        return AuthStateStore._instance;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<AuthStateStoreTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends AuthStateStoreTopic>(topic: T): () => AuthStateStoreTopicPayloads[T] {
        return (): AuthStateStoreTopicPayloads[T] => {
            if (topic === AuthStateStoreTopic.AUTH_STATE) {
                return this._authState as AuthStateStoreTopicPayloads[T];
            }
            if (topic === AuthStateStoreTopic.USER_INFO) {
                return this._userInfo as AuthStateStoreTopicPayloads[T];
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
    }

    /**
     * Asks the backend who is logged in, and sets the auth state and user info accordingly.
     *
     * @param apiClient Client to send the request with - defaults to the global API client
     */
    async fetchLoggedInUser(apiClient?: Client): Promise<void> {
        const userInfo = await this.requestLoggedInUser(true, apiClient);
        if (!userInfo) {
            this.setAuthState(AuthState.NotLoggedIn);
            return;
        }

        // Set before the auth state, so subscribers reacting to the login find the user info in place
        this._userInfo = userInfo;
        this._publishSubscribeDelegate.notifySubscribers(AuthStateStoreTopic.USER_INFO);
        this.setAuthState(AuthState.LoggedIn);
    }

    /**
     * Whether the backend has a logged in user - without changing the auth state.
     * E.g. to detect a login in another window, which requires a reload rather than continuing in place.
     *
     * @param apiClient Client to send the request with - defaults to the global API client
     */
    async checkIsLoggedInOnBackend(apiClient?: Client): Promise<boolean> {
        // Only the login matters here - no need for the backend to fetch avatar and display name from Microsoft Graph
        return (await this.requestLoggedInUser(false, apiClient)) !== null;
    }

    /**
     * Returns null if no user is logged in, or the request fails
     *
     * @param includeGraphApiInfo Whether to include the user's avatar and display name from Microsoft Graph
     */
    private async requestLoggedInUser(includeGraphApiInfo: boolean, apiClient?: Client): Promise<UserInfo_api | null> {
        try {
            const response = await getLoggedInUser({
                client: apiClient,
                query: {
                    includeGraphApiInfo,
                },
                // This request determines the auth state, so it must be sent before the user is known to be logged in
                meta: SKIP_AUTH_GUARD_META,
                throwOnError: true,
            });
            return response.data;
        } catch (err) {
            console.warn(err);
            return null;
        }
    }

    getUserInfo(): UserInfo_api | null {
        return this._userInfo;
    }

    setAuthState(authState: AuthState) {
        if (this._authState === authState) {
            return;
        }
        this._authState = authState;
        this._publishSubscribeDelegate.notifySubscribers(AuthStateStoreTopic.AUTH_STATE);
    }

    getAuthState(): AuthState {
        return this._authState;
    }

    isLoggedIn(): boolean {
        return this._authState === AuthState.LoggedIn;
    }
}
