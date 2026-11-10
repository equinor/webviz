import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { CanceledError, isAxiosError } from "axios";

/**
 * Pass as `meta` to a request that must be sent before the user is known to be logged in,
 * i.e. the request that determines the auth state in the first place.
 */
export const SKIP_AUTH_GUARD_META = { skipAuthGuard: true } as const;

export type AuthInterceptorCallbacks = {
    /** Whether the user is logged in. Evaluated before every request. */
    isLoggedIn: () => boolean;
    /** Called whenever the backend responds with 401 Unauthorized. */
    onUnauthorized: () => void;
};

function skipsAuthGuard(config: InternalAxiosRequestConfig): boolean {
    // The generated API client passes request options, including `meta`, through to the axios config
    const meta = (config as InternalAxiosRequestConfig & { meta?: Record<string, unknown> }).meta;
    return meta?.skipAuthGuard === true;
}

/**
 * Requests are only sent while the user is logged in - before that, or after a logout, they are bound to fail
 * with a 401. Background work (e.g. session metadata and ensemble fingerprint polling) may outlive the
 * workbench UI, so we block requests at the client level instead of relying on each caller to stop.
 *
 * Returns a function that ejects the interceptors again.
 */
export function installAuthInterceptors(axiosInstance: AxiosInstance, callbacks: AuthInterceptorCallbacks): () => void {
    const requestInterceptorId = axiosInstance.interceptors.request.use(function blockUnlessLoggedIn(config) {
        if (!skipsAuthGuard(config) && !callbacks.isLoggedIn()) {
            throw new CanceledError("Request blocked: user is not logged in");
        }
        return config;
    });

    const responseInterceptorId = axiosInstance.interceptors.response.use(
        undefined,
        function logoutOnUnauthorized(error) {
            if (isAxiosError(error) && error.response?.status === 401) {
                callbacks.onUnauthorized();
            }
            return Promise.reject(error);
        },
    );

    return function ejectAuthInterceptors() {
        axiosInstance.interceptors.request.eject(requestInterceptorId);
        axiosInstance.interceptors.response.eject(responseInterceptorId);
    };
}
