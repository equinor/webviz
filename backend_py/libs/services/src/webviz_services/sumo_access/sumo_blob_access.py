import httpx

from webviz_services.services_config import get_services_config
from webviz_services.service_exceptions import AuthorizationError, Service
from webviz_services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER


async def get_sas_token_and_blob_base_uri_for_case_async(sumo_access_token: str, case_uuid: str) -> tuple[str, str]:
    """
    Get a SAS token and a base URI that allows reading of all children of case_uuid
    The returned base uri looks something like this:
        https://xxxsumoxxx.blob.core.windows.net/{case_uuid}

    To actually fetch data for a blob belonging to this case, you need to form a SAS URI:
        {blob_store_base_uri}/{my_blob_id}?{sas_token}
    """

    services_config = get_services_config()
    sumo_base_uri = f"https://main-sumo-{services_config.sumo_env}.radix.equinor.com/api/v1"

    req_url = f"{sumo_base_uri}/objects('{case_uuid}')/authtoken"
    req_headers = {"Authorization": f"Bearer {sumo_access_token}"}

    try:
        res = await HTTPX_ASYNC_CLIENT_WRAPPER.client.get(url=req_url, headers=req_headers, timeout=60)
        res.raise_for_status()
    except httpx.HTTPError as exc:
        raise AuthorizationError(f"Failed to get SAS token for case {case_uuid}", Service.GENERAL) from exc

    body = res.json()
    sas_token = body["auth"]
    blob_store_base_uri = body["baseuri"].removesuffix("/")

    return sas_token, blob_store_base_uri
