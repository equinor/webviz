import httpx

from sumo.wrapper import SumoClient
from webviz_services.service_exceptions import AuthorizationError, Service


async def get_sas_token_and_blob_base_uri_for_case_async(sumo_client: SumoClient, case_uuid: str) -> tuple[str, str]:
    """
    Get a SAS token and a base URI that allows reading of all children of case_uuid
    The returned base uri looks something like this:
        https://xxxsumoxxx.blob.core.windows.net/{case_uuid}

    To actually fetch data for a blob belonging to this case, you need to form a SAS URI:
        {blob_store_base_uri}/{my_blob_id}?{sas_token}
    """

    endpoint_path = f"/objects('{case_uuid}')/authtoken"

    try:
        res = await sumo_client.get_async(endpoint_path)
        res.raise_for_status()
    except httpx.HTTPError as exc:
        raise AuthorizationError(f"Failed to get SAS token for case {case_uuid}", Service.GENERAL) from exc

    body = res.json()
    sas_token = body["auth"]
    blob_store_base_uri = body["baseuri"].removesuffix("/")

    return sas_token, blob_store_base_uri
