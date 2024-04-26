import requests

from primary import config
from primary.services.service_exceptions import AuthorizationError, Service

SUMO_BASE_URI = f"https://main-sumo-{config.SUMO_ENV}.radix.equinor.com/api/v1"


def get_sas_token_and_blob_store_base_uri_for_case(sumo_access_token: str, case_uuid: str) -> tuple[str, str]:
    """
    Get a SAS token and a base URI that allows reading of all children of case_uuid
    The returned base uri looks something like this:
        https://xxxsumoxxx.blob.core.windows.net/{case_uuid}

    To actually fetch data for a blob belonging to this case, you need to form a SAS URI:
        {blob_store_base_uri}/{my_blob_id}?{sas_token}
    """

    req_url = f"{SUMO_BASE_URI}/objects('{case_uuid}')/authtoken"
    req_headers = {"Authorization": f"Bearer {sumo_access_token}"}
    res = requests.get(url=req_url, headers=req_headers, timeout=60)
    if res.status_code != 200:
        raise AuthorizationError(f"Failed to get SAS token for case {case_uuid}", Service.GENERAL)

    body = res.json()
    sas_token = body["auth"]
    blob_store_base_uri = body["baseuri"].removesuffix("/")

    return sas_token, blob_store_base_uri
