import os
from dotenv import load_dotenv

# Load environment variables from .env file
# Note that values set in the system environment will override those in the .env file
load_dotenv()

TENANT_ID = os.environ["WEBVIZ_TENANT_ID"]
CLIENT_ID = os.environ["WEBVIZ_CLIENT_ID"]
CLIENT_SECRET = os.environ["WEBVIZ_CLIENT_SECRET"]
SUMO_RESOURCE_SCOPE = os.environ["WEBVIZ_SUMO_RESOURCE_SCOPE"]
SMDA_RESOURCE_SCOPE = os.environ["WEBVIZ_SMDA_RESOURCE_SCOPE"]

# Allow None her for now, since we don't always run with redis and a password
REDIS_PASSWORD: str = os.environ.get("WEBVIZ_REDIS_PASSWORD")

GRAPH_SCOPES = ["User.Read"]
RESOURCE_SCOPES_DICT = {
    "sumo": [SUMO_RESOURCE_SCOPE],
    "smda": [SMDA_RESOURCE_SCOPE],
}

# Format: redis://[[username]:[password]]@localhost:6379/0
# REDIS_URL = "redis://localhost"
REDIS_URL = f"redis://:{REDIS_PASSWORD}@redis:6379"

SESSION_STORAGE = "in_memory"  # "in_memory" / "filesystem" / "redis"
SESSION_STORAGE = os.environ.get("WEBVIZ_SESSION_STORAGE", SESSION_STORAGE)

SUMO_CONFIG = {"sumo_env": "prod", "field": "DROGON", "status": None}


