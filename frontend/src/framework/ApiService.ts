import { ApiService as ApiServiceBase } from "@api";

class ApiService extends ApiServiceBase {
    constructor() {
        const apiConfig = {
            WITH_CREDENTIALS: true,
        };
        super(apiConfig);
    }
}

export const apiService = new ApiService();
