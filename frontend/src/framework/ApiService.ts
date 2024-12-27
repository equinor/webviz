import { ApiService as ApiServiceBase } from "@api";

export const DEFAULT_API_CONFIG = {
    WITH_CREDENTIALS: true,
};

class ApiService extends ApiServiceBase {
    constructor() {
        super(DEFAULT_API_CONFIG);
    }
}

export const apiService = new ApiService();
