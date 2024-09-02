import os
from dataclasses import dataclass

import pytest

from primary.services.utils.authenticated_user import AuthenticatedUser, AccessTokens

# from primary.main import app as primary_app
# from fastapi.testclient import TestClient

# @pytest.fixture(name="primary_client")
# def fixture_primary_client():
#     yield TestClient(primary_app)


@dataclass
class SumoTestEnsemble:
    field_identifier: str
    case_uuid: str
    case_name: str
    ensemble_name: str


@pytest.fixture(name="sumo_test_ensemble_prod", scope="session")
def fixture_sumo_test_ensemble_prod() -> SumoTestEnsemble:
    return SumoTestEnsemble(
        field_identifier="DROGON",
        case_name="webviz_ahm_case",
        case_uuid="485041ce-ad72-48a3-ac8c-484c0ed95cf8",
        ensemble_name="iter-0",
    )


@pytest.fixture(name="test_user", scope="session")
def fixture_test_user():
    token = "DUMMY_TOKEN_FOR_TESTING"
    tokens = AccessTokens(sumo_access_token=token)
    return AuthenticatedUser(user_id="test_user", username="test_user", access_tokens=tokens)
