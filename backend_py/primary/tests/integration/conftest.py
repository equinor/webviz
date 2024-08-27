import os
from dataclasses import dataclass

import pytest
from sumo.wrapper import SumoClient

from primary.services.utils.authenticated_user import AuthenticatedUser, AccessTokens

# from primary.main import app as primary_app
# from fastapi.testclient import TestClient

# @pytest.fixture(name="primary_client")
# def fixture_primary_client():
#     yield TestClient(primary_app)


@dataclass
class SumoTestEnsemble:
    case_uuid: str
    ensemble_name: str


@pytest.fixture(name="sumo_test_ensemble_ahm")
def fixture_sumo_test_ensemble_ahm() -> SumoTestEnsemble:
    return SumoTestEnsemble(case_uuid="485041ce-ad72-48a3-ac8c-484c0ed95cf8", ensemble_name="iter-0")


@pytest.fixture(name="test_user")
def fixture_test_user():
    # Get tokens from environment variables
    token = os.getenv("SUMO_TOKEN")
    if token is None:
        client = SumoClient(env="prod")
        token = client.authenticate()
    tokens = AccessTokens(sumo_access_token=token)

    return AuthenticatedUser(user_id="test_user", username="test_user", access_tokens=tokens)
