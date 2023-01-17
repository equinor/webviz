from fmu.sumo.explorer import Explorer


def get_case_ids_with_smry_data(access_token: str, field: str):
    explorer = Explorer(env="prod", token=access_token)
    hits = explorer.sumo.get(
        "/search",
        query=f"class:table AND \
                masterdata.smda.field.identifier:{field} AND \
                data.name:summary AND \
                fmu.realization.id:0 AND \
                fmu.iteration.id:0",
        select="_sumo.parent_object",
    )["hits"]["hits"]
    if not hits:
        return []
    return [hit["_source"]["_sumo"]["parent_object"] for hit in hits]


def get_iteration_ids_for_case_id(access_token: str, case_id: str):
    explorer = Explorer(env="prod", token=access_token)
    case = explorer.get_case_by_id(case_id)
    obj_ids = case.get_summary_object_ids(size=10000)
    stream = explorer.get_objects(list(obj_ids.values())[0])
    print(stream)
    return case.get_iterations()
