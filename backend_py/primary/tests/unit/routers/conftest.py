import importlib
import os
import sys
from unittest import mock

import httpx


def _import_primary_config_offline() -> None:
    # primary.config requires env vars and performs an HTTP GET to Sumo at import time; stub both
    if "primary.config" in sys.modules:
        return
    dummy_env = {
        name: os.environ.get(name, "0")
        for name in [
            "WEBVIZ_SMDA_SUBSCRIPTION_KEY",
            "WEBVIZ_ENTERPRISE_SUBSCRIPTION_KEY",
            "WEBVIZ_VDS_HOST_ADDRESS",
            "WEBVIZ_REDIS_AUTH_STORE_PASSWORD",
            "WEBVIZ_REDIS_CACHE_PASSWORD",
        ]
    }
    dummy_env["WEBVIZ_SESSION_STORE_FERNET_KEY"] = os.environ.get("WEBVIZ_SESSION_STORE_FERNET_KEY", "A" * 43 + "=")
    dummy_env["WEBVIZ_SERVICE_BUS_PAYLOAD_FERNET_KEY"] = os.environ.get(
        "WEBVIZ_SERVICE_BUS_PAYLOAD_FERNET_KEY", "A" * 43 + "="
    )
    dummy_env["WEBVIZ_LOCAL_DEVELOPER_QUALIFIER"] = os.environ.get("WEBVIZ_LOCAL_DEVELOPER_QUALIFIER", "NoDeveloper")
    well_known_stub = mock.Mock()
    well_known_stub.json.return_value = {"envs": {os.getenv("WEBVIZ_SUMO_ENV", "prod"): {"resource_id": "offline"}}}
    with mock.patch.dict(os.environ, dummy_env), mock.patch.object(httpx, "get", return_value=well_known_stub):
        importlib.import_module("primary.config")


# Runs at conftest import, which is before the test modules in this folder import any router
_import_primary_config_offline()
