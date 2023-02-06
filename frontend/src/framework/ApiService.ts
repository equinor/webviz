import { ApiService as ApiServiceBase } from "@api";

import { makeUrl, urlToString } from "./utils/url";

class ApiService extends ApiServiceBase {
    constructor() {
        const apiConfig = {
            BASE: urlToString(
                makeUrl({
                    hostname: "localhost",
                    protocol: "http",
                    port: 8000,
                    pathname: "",
                })
            ),
            WITH_CREDENTIALS: true,
        };
        super(apiConfig);
    }
}

export const apiService = new ApiService();
