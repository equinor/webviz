import os

from webviz_core_utils.radix_utils import is_running_on_radix_platform

TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
CLIENT_ID = "900ed417-a860-4970-bd37-73b059ca6f0d"
CLIENT_SECRET = os.environ["WEBVIZ_CLIENT_SECRET"]

PSEUDONYM_HMAC_KEY = os.getenv("WEBVIZ_PSEUDONYM_HMAC_KEY")

SMDA_SUBSCRIPTION_KEY = os.environ["WEBVIZ_SMDA_SUBSCRIPTION_KEY"]
ENTERPRISE_SUBSCRIPTION_KEY = os.environ["WEBVIZ_ENTERPRISE_SUBSCRIPTION_KEY"]
SUMO_ENV = os.getenv("WEBVIZ_SUMO_ENV", "prod")
VDS_HOST_ADDRESS = os.environ["WEBVIZ_VDS_HOST_ADDRESS"]

SURFACE_QUERY_URL = "http://surface-query:5001"

GRAPH_SCOPES = ["User.Read", "User.ReadBasic.All"]

SUMO_OAUTH_SCOPES_BY_ENV = {
    "dev": "api://88d2b022-3539-4dda-9e66-853801334a86/access_as_user",
    "prod": "api://9e5443dd-3431-4690-9617-31eed61cb55a/access_as_user",
}
RESOURCE_SCOPES_DICT = {
    "smda": ["api://691a29c5-8199-4e87-80a2-16bd71e831cd/user_impersonation"],
    "ssdl": ["8b6e5eb9-edc8-4086-83cb-afa5cc185b23/user_impersonation"],
    "pdm": ["f2e415dc-d400-4cd4-a801-fa707138a49c/user_impersonation"],
}


def get_sumo_oauth_scope() -> str:
    sumo_oauth_scope = SUMO_OAUTH_SCOPES_BY_ENV.get(SUMO_ENV)
    if sumo_oauth_scope is not None:
        return sumo_oauth_scope

    raise RuntimeError(f"Unsupported Sumo environment '{SUMO_ENV}', expected 'prod' or 'dev'")


def get_resource_scopes(resource_name: str) -> list[str] | None:
    if resource_name == "sumo":
        return [get_sumo_oauth_scope()]

    return RESOURCE_SCOPES_DICT.get(resource_name)


REDIS_USER_SESSION_URL = "redis://redis-user-session:6379"
REDIS_CACHE_URL = "redis://redis-cache:6379"

_is_on_radix_platform = is_running_on_radix_platform()
if _is_on_radix_platform:
    COSMOS_DB_URL = os.getenv("WEBVIZ_COSMOS_DB_URL", "https://webviz-db.documents.azure.com:443/")
else:
    COSMOS_DB_URL = os.getenv("WEBVIZ_COSMOS_DB_URL", "https://webviz-dev-db.documents.azure.com:443/")
