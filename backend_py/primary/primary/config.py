import os

# Import these from sumo wrapper package in order to grab the resource scopes
from sumo.wrapper.config import APP_REGISTRATION as sumo_app_reg


TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
CLIENT_ID = "900ed417-a860-4970-bd37-73b059ca6f0d"
CLIENT_SECRET = os.environ["WEBVIZ_CLIENT_SECRET"]

SMDA_SUBSCRIPTION_KEY = os.environ["WEBVIZ_SMDA_SUBSCRIPTION_KEY"]
ENTERPRISE_SUBSCRIPTION_KEY = os.environ["WEBVIZ_ENTERPRISE_SUBSCRIPTION_KEY"]
SUMO_ENV = os.getenv("WEBVIZ_SUMO_ENV", "prod")
VDS_HOST_ADDRESS = os.environ["WEBVIZ_VDS_HOST_ADDRESS"]

SURFACE_QUERY_URL = "http://surface-query:5001"

GRAPH_SCOPES = ["User.Read", "User.ReadBasic.All"]
RESOURCE_SCOPES_DICT = {
    "sumo": [f"api://{sumo_app_reg[SUMO_ENV]['RESOURCE_ID']}/access_as_user"],
    "smda": ["api://691a29c5-8199-4e87-80a2-16bd71e831cd/user_impersonation"],
    "ssdl": ["8b6e5eb9-edc8-4086-83cb-afa5cc185b23/user_impersonation"],
    "pdm": ["f2e415dc-d400-4cd4-a801-fa707138a49c/user_impersonation"],
}
REDIS_USER_SESSION_URL = "redis://redis-user-session:6379"
REDIS_CACHE_URL = "redis://redis-cache:6379"

_is_on_radix_platform = os.getenv("RADIX_APP") is not None
if _is_on_radix_platform:
    COSMOS_DB_URL = os.getenv("WEBVIZ_COSMOS_DB_URL", "https://webviz-db.documents.azure.com:443/")
else:
    COSMOS_DB_URL = os.getenv("WEBVIZ_COSMOS_DB_URL", "https://webviz-dev-db.documents.azure.com:443/")
