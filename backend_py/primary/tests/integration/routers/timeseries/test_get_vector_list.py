from primary.routers.timeseries import router
from primary.routers.timeseries import schemas
from sumo.wrapper import SumoClient

from primary.services.utils.authenticated_user import AuthenticatedUser, AccessTokens
from primary.services.sumo_access.summary_access import SummaryAccess
from fmu.sumo.explorer import Explorer

async def test_get_vector_list(test_user, sumo_test_ensemble_ahm):

    client = SumoClient(env="prod")
    sumo = Explorer(env="prod")
    cases = [case.uuid for case in sumo.cases]
    assert "485041ce-ad72-48a3-ac8c-484c0ed95cf8" in cases

    token = "TEST_USER"
    tokens = AccessTokens(sumo_access_token=token)
    user =  AuthenticatedUser(user_id="test_user", username="test_user", access_tokens=tokens)
    assert user.has_sumo_access_token() == True
    assert len(user.get_sumo_access_token()) == 537

    




    res = client.post("/search", json={})

    response = await client.post_async("/search", json={})
    query_dict = {
        "bool": {
            "must": [
                {"term": {"class": "table"}},
                {"term": {"_sumo.parent_object.keyword": "485041ce-ad72-48a3-ac8c-484c0ed95cf8"}},
                {"term": {"fmu.iteration.name.keyword": "iter-0"}},
                {"term": {"fmu.context.stage.keyword": "iteration"}},
                {"term": {"fmu.aggregation.operation.keyword": "collection"}},
                {"term": {"data.tagname.keyword": "summary"}},
                {"term": {"data.content.keyword": "timeseries"}},
            ],
        }
    }

    search_payload = {
        "track_total_hits": True,
        "query": query_dict,
        "aggs": {
            "smry_tables": {
                "terms": {"field": "data.name.keyword"},
                "aggs": {
                    "smry_columns": {
                        "terms": {"field": "data.spec.columns.keyword", "size": 65535},
                    },
                },
            },
        },
        "_source": False,
        "size": 0,
    }

    response = await client.post_async("/search", json=search_payload)
    assert response.status_code == 200

    access = SummaryAccess.from_case_uuid(user.get_sumo_access_token(), "485041ce-ad72-48a3-ac8c-484c0ed95cf8", "iter-0")
    

    vector_info_arr = await access.get_available_vectors_async()
    

    ret_arr: list[schemas.VectorDescription] = [
        schemas.VectorDescription(name=vi.name, descriptive_name=vi.name, has_historical=vi.has_historical)
        for vi in vector_info_arr
    ]
    assert len(ret_arr) == 786
    assert isinstance(ret_arr[0], schemas.VectorDescription)
    # vector_list = await router.get_vector_list(
    #     None, user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name
    # )
    
    # assert len(vector_list) == 786
    # assert isinstance(vector_list[0], schemas.VectorDescription)
