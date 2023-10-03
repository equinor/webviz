import os

from sumo.wrapper import SumoClient


SUMO_ENV = os.getenv("WEBVIZ_SUMO_ENV", "dev")


def create_sumo_client_instance(access_token: str) -> SumoClient:
    sumo_client = SumoClient(env=SUMO_ENV, token=access_token, interactive=False)
    return sumo_client
