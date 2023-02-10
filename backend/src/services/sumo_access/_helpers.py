from dataclasses import dataclass
from typing import Optional, List
from sumo.wrapper import SumoClient

SUMO_ENV="prod"

def create_sumo_client_instance(access_token: str) -> SumoClient:
    sumo_client = SumoClient(env=SUMO_ENV, token=access_token, interactive=False)
    return sumo_client


@dataclass(frozen=True)
class IterSpec:
    case_uuid: str
    iteration_id: int
    iteration_name: str

def encode_iteration_pseudo_uuid(iter_spec: IterSpec) -> str:
    return f"{iter_spec.iteration_id}~{iter_spec.iteration_name}~{iter_spec.case_uuid}"

def decode_iteration_pseudo_uuid(iteration_pseudo_uuid: str) -> Optional[IterSpec]:
    str_arr: List[str] = iteration_pseudo_uuid.split("~")
    if len(str_arr) != 3:
        return None

    return IterSpec(iteration_id=str_arr[0], iteration_name=str_arr[1], case_uuid=str_arr[2])
