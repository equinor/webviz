import os

import pytest
from sumo.wrapper import SumoClient


@pytest.fixture(name="sumo_token")
def fixture_sumo_token() -> str:
    token = os.getenv("SUMO_TOKEN")
    if token is None:
        client = SumoClient(env="dev")
        token = client.authenticate()
    return token


@pytest.fixture(name="sumo_case_uuid")
def fixture_sumo_case_uuid() -> str:
    return "10f41041-2c17-4374-a735-bb0de62e29dc"
