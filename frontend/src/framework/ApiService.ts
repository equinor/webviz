import { ApiService as ApiServiceBase } from "@api";

import { makeUrl, urlToString } from "./utils/url";

class ApiService extends ApiServiceBase {
    constructor() {
        const protocol = window.location.protocol === "https" ? "https" : "http";
        const apiConfig = {
            WITH_CREDENTIALS: true,
        };
        super(apiConfig);
    }
}

export const apiService = new ApiService();
