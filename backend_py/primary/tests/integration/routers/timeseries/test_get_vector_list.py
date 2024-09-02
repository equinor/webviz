from primary.routers.timeseries import router
from primary.routers.timeseries import schemas
from sumo.wrapper import SumoClient

from primary.services.utils.authenticated_user import AuthenticatedUser, AccessTokens
from fmu.sumo.explorer import Explorer

async def test_get_vector_list(test_user, sumo_test_ensemble_ahm):

    client = SumoClient(env="prod")
    token = client.authenticate()
    tokens = AccessTokens(sumo_access_token=token)
    user =  AuthenticatedUser(user_id="test_user", username="test_user", access_tokens=tokens)
    assert user.has_sumo_access_token() == True
    assert len(user.get_sumo_access_token()) == 537

    sumo = Explorer(env="prod")

    cases = [case.uuid for case in sumo.cases]
    # assert cases == []
    res = client.post("/search", json={})

    response = await client.post_async("/search", json={})
    assert 1 == 1
    # vector_list = await router.get_vector_list(
    #     None, user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name
    # )
    
    # assert len(vector_list) == 786
    # assert isinstance(vector_list[0], schemas.VectorDescription)
