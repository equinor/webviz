export const BASE_URL = "https://equinor.service-now.com/selfservice";
export const WEBVIZ_APP_ID = "7d404bd21b602090670c553d6e4bcbf5";
export const SYSTEM_ID = "7007cccac334ea100090dadf050131d2";

export function makeServiceNowErrorReportUrl(): URL {
    const url = new URL(BASE_URL);
    url.searchParams.set("id", "sc_cat_item");
    url.searchParams.set("sys_id", SYSTEM_ID);
    url.searchParams.set("sysparm_business_application", WEBVIZ_APP_ID);

    return url;
}
