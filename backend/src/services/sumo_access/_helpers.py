from sumo.wrapper import SumoClient

from src import config


def create_sumo_client_instance(access_token: str) -> SumoClient:
    sumo_client = SumoClient(env=config.SUMO_ENV, token=access_token, interactive=False)
    return sumo_client
