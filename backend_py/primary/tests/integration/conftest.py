import os
from dataclasses import dataclass

import pytest

from primary.services.utils.authenticated_user import AuthenticatedUser, AccessTokens


@dataclass
class SumoTestEnsemble:
    field_identifier: str
    case_uuid: str
    case_name: str
    ensemble_name: str


@pytest.fixture(name="sumo_test_ensemble_ahm", scope="session")
def fixture_sumo_test_ensemble_ahm() -> SumoTestEnsemble:
    return SumoTestEnsemble(
        field_identifier="DROGON",
        case_name="webviz_ahm_case",
        case_uuid="485041ce-ad72-48a3-ac8c-484c0ed95cf8",
        ensemble_name="iter-0",
    )


@pytest.fixture(name="sumo_test_ensemble_design", scope="session")
def fixture_sumo_test_ensemble_design() -> SumoTestEnsemble:
    return SumoTestEnsemble(
        field_identifier="DROGON",
        case_name="01_drogon_design",
        case_uuid="b89873c8-6f4d-40e5-978c-afc47beb2a26",
        ensemble_name="iter-0",
    )


@pytest.fixture(name="test_user", scope="session")
def fixture_test_user() -> AuthenticatedUser:
    token = "DUMMY_TOKEN_FOR_TESTING"
    tokens = AccessTokens(
        sumo_access_token=token, graph_access_token=None, smda_access_token=None, ssdl_access_token=None
    )
    return AuthenticatedUser(user_id="test_user", username="test_user", access_tokens=tokens)
