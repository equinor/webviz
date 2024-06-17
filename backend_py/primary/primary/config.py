import os
from dotenv import load_dotenv

# Import these from sumo wrapper package in order to grab the resource scopes
from sumo.wrapper.config import APP_REGISTRATION as sumo_app_reg

# Load environment variables from .env file
# Note that values set in the system environment will override those in the .env file
load_dotenv()


TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
CLIENT_ID = "900ed417-a860-4970-bd37-73b059ca6f0d"

CLIENT_SECRET = os.environ["WEBVIZ_CLIENT_SECRET"]
SMDA_SUBSCRIPTION_KEY = os.environ["WEBVIZ_SMDA_SUBSCRIPTION_KEY"]
SMDA_RESOURCE_SCOPE = os.environ["WEBVIZ_SMDA_RESOURCE_SCOPE"]
ENTERPRISE_SUBSCRIPTION_KEY = os.environ["WEBVIZ_ENTERPRISE_SUBSCRIPTION_KEY"]
SSDL_RESOURCE_SCOPE = os.environ["WEBVIZ_SSDL_RESOURCE_SCOPE"]
SUMO_ENV = os.getenv("WEBVIZ_SUMO_ENV", "prod")
GRAPH_SCOPES = ["User.Read", "User.ReadBasic.All"]
VDS_HOST_ADDRESS = os.environ["WEBVIZ_VDS_HOST_ADDRESS"]

SURFACE_QUERY_URL = "http://surface-query:5001"

RESOURCE_SCOPES_DICT = {
    "sumo": [f"api://{sumo_app_reg[SUMO_ENV]['RESOURCE_ID']}/access_as_user"],
    "smda": [SMDA_RESOURCE_SCOPE],
    "ssdl": [SSDL_RESOURCE_SCOPE],
}

print(f"{RESOURCE_SCOPES_DICT=}")

REDIS_USER_SESSION_URL = "redis://redis-user-session:6379"
REDIS_CACHE_URL = "redis://redis-cache:6379"
