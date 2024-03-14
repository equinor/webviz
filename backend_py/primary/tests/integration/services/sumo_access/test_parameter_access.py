import pytest

from services.sumo_access.parameter_access import ParameterAccess


@pytest.fixture(name="parameter_access_instance")
def get_parameter_access_instance(sumo_token: str, sumo_case_uuid: str) -> ParameterAccess:
    return ParameterAccess.from_case_uuid(sumo_token, sumo_case_uuid, "iter-0")


def test_init(parameter_access_instance: ParameterAccess, sumo_case_uuid: str) -> None:
    assert len(parameter_access_instance.case_collection) == 1
    assert parameter_access_instance.case_collection[0].uuid == sumo_case_uuid


async def test_get_parameters_and_sensitivities(parameter_access_instance: ParameterAccess) -> None:
    parameters_and_sensitivities = await parameter_access_instance.get_parameters_and_sensitivities()
    assert len(parameters_and_sensitivities.parameters) == 113
    assert len(parameters_and_sensitivities.sensitivities) == 1
