import pytest

import services.sumo_access.parameter_access as parameter_access


@pytest.fixture(name="parameter_access_instance")
def get_parameter_access_instance(sumo_token, sumo_case_uuid) -> str:
    return parameter_access.ParameterAccess(sumo_token, sumo_case_uuid, "iter-0")


def test_init(parameter_access_instance, sumo_case_uuid):
    assert len(parameter_access_instance.case_collection) == 1
    assert parameter_access_instance.case_collection[0].uuid == sumo_case_uuid


def test_get_parameters_and_sensitivities(parameter_access_instance):
    parameters_and_sensitivities = parameter_access_instance.get_parameters_and_sensitivities()
    assert len(parameters_and_sensitivities.parameters) == 113
    assert len(parameters_and_sensitivities.sensitivities) == 1
