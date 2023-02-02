from fmu.sumo.explorer import Explorer


SUMO_ENV="prod"

def create_sumo_explorer_instance(access_token: str) -> Explorer:
    explorer = Explorer(env=SUMO_ENV, token=access_token, interactive=False)
    return explorer

