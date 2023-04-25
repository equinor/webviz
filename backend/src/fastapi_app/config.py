import os

# Import these from sumo wrapper package in order to grab the resource scopes
from sumo.wrapper.config import APP_REGISTRATION as sumo_app_reg

TENANT_ID = "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
CLIENT_ID = "900ed417-a860-4970-bd37-73b059ca6f0d"

CLIENT_SECRET = os.environ["WEBVIZ_CLIENT_SECRET"]


GRAPH_SCOPES = ["User.Read"]

RESOURCE_SCOPES_DICT = {
    #"sumo": [f"api://{sumo_app_reg['prod']['RESOURCE_ID']}/access_as_user"],

    # Note that when switching back to prod, SUMO env in create_sumo_client_instance() must also be changed
    "sumo": [f"api://{sumo_app_reg['dev']['RESOURCE_ID']}/access_as_user"],
}

# Since we are not using SMDA yet, leave it as optional
SMDA_RESOURCE_SCOPE = os.environ.get("WEBVIZ_SMDA_RESOURCE_SCOPE")
if SMDA_RESOURCE_SCOPE is not None:
    RESOURCE_SCOPES_DICT["smda"] = [SMDA_RESOURCE_SCOPE]

print(f"{RESOURCE_SCOPES_DICT=}")


# Allow None her for now, since we don't always run with redis and a password
# REDIS_PASSWORD: str = os.environ.get("WEBVIZ_REDIS_PASSWORD")

# Format: redis://[[username]:[password]]@localhost:6379/0
# REDIS_URL = "redis://localhost"
# REDIS_URL = f"redis://:{REDIS_PASSWORD}@redis:6379"
REDIS_URL = f"redis://redis:6379"

SESSION_STORAGE = "redis"
