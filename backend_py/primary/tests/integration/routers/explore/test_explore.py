from primary.routers.explore import router
from primary.routers.explore import schemas


async def test_get_fields(test_user, sumo_test_ensemble_ahm) -> None:
    fields = await router.get_fields(test_user)
    assert all(isinstance(f, schemas.FieldInfo) for f in fields)
    assert any(f.field_identifier == sumo_test_ensemble_ahm.field_identifier for f in fields)


async def test_get_cases(test_user, sumo_test_ensemble_ahm) -> None:
    cases = await router.get_cases(test_user, sumo_test_ensemble_ahm.field_identifier)
    assert all(isinstance(c, schemas.CaseInfo) for c in cases)
    assert any(c.uuid == sumo_test_ensemble_ahm.case_uuid for c in cases)


async def test_get_ensembles(test_user, sumo_test_ensemble_ahm) -> None:
    ensembles = await router.get_ensembles(test_user, sumo_test_ensemble_ahm.case_uuid)
    assert all(isinstance(e, schemas.EnsembleInfo) for e in ensembles)
    assert any(e.name == sumo_test_ensemble_ahm.ensemble_name for e in ensembles)


async def test_get_ensemble_details(test_user, sumo_test_ensemble_ahm) -> None:
    ensemble_details = await router.get_ensemble_details(
        test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name
    )
    assert isinstance(ensemble_details, schemas.EnsembleDetails)
    assert ensemble_details.name == sumo_test_ensemble_ahm.ensemble_name
    assert ensemble_details.field_identifier == sumo_test_ensemble_ahm.field_identifier
    assert ensemble_details.case_uuid == sumo_test_ensemble_ahm.case_uuid
    assert ensemble_details.case_name == sumo_test_ensemble_ahm.case_name
    assert len(ensemble_details.realizations) == 100
