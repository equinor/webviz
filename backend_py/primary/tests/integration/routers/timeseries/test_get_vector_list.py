# pylint: disable=async-suffix
# type: ignore

from primary.routers.timeseries import router
from primary.routers.timeseries import schemas
from tests.integration.conftest import SumoTestEnsemble


async def test_get_vector_list(test_user: router.AuthenticatedUser, sumo_test_ensemble_ahm: SumoTestEnsemble) -> None:

    vector_list = await router.get_vector_list(
        None, test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name
    )

    assert len(vector_list) == 786
    assert isinstance(vector_list[0], schemas.VectorDescription)
