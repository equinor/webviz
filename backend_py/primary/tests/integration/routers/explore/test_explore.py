# pylint: disable=async-suffix
from primary.routers.explore import router
from primary.routers.explore import schemas
from tests.integration.conftest import SumoTestEnsemble


async def test_get_fields(test_user: router.AuthenticatedUser, sumo_test_ensemble_ahm: SumoTestEnsemble) -> None:
    fields = await router.get_fields(test_user)
    assert all(isinstance(f, schemas.FieldInfo) for f in fields)
    assert any(f.fieldIdentifier == sumo_test_ensemble_ahm.field_identifier for f in fields)


async def test_get_cases(test_user: router.AuthenticatedUser, sumo_test_ensemble_ahm: SumoTestEnsemble) -> None:
    cases = await router.get_cases(test_user, sumo_test_ensemble_ahm.field_identifier)
    assert all(isinstance(c, schemas.CaseInfo) for c in cases)
    assert any(c.uuid == sumo_test_ensemble_ahm.case_uuid for c in cases)
    case = next(c for c in cases if c.uuid == sumo_test_ensemble_ahm.case_uuid)
    assert any(e.name == sumo_test_ensemble_ahm.ensemble_name for e in case.ensembles)


async def test_get_ensemble_details(
    test_user: router.AuthenticatedUser, sumo_test_ensemble_ahm: SumoTestEnsemble
) -> None:
    ensemble_details = await router.get_ensemble_details(
        test_user, sumo_test_ensemble_ahm.case_uuid, sumo_test_ensemble_ahm.ensemble_name
    )
    assert isinstance(ensemble_details, schemas.EnsembleDetails)
    assert ensemble_details.name == sumo_test_ensemble_ahm.ensemble_name
    assert ensemble_details.fieldIdentifier == sumo_test_ensemble_ahm.field_identifier
    assert ensemble_details.caseUuid == sumo_test_ensemble_ahm.case_uuid
    assert ensemble_details.caseName == sumo_test_ensemble_ahm.case_name
    assert len(ensemble_details.realizations) == 100
