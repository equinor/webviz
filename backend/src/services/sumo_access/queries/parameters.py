from typing import List, Dict, Optional, Union
from sumo.wrapper import SumoClient
from pydantic import BaseModel


class SumoEnsembleParameter(BaseModel):
    name: str
    groupname: Optional[str] = None
    values: Union[List[float], List[int], List[str]]
    realizations: List[int]


def get_parameters_for_iteration(sumo_client: SumoClient, case_id: str, iteration: str) -> List[SumoEnsembleParameter]:
    """Get parameters for a case and iteration
    Temporary until handled by the explorer
    The format of the parameter response should be discussed. The current nested structure with parameter groups is confusing.
    Example response for a single realization:
    {
        parameterA: value,

        parameterB:value,

        GroupA: {

            parameterC:value,

            parameterD:value
        },

        // If a design matrix is used:

        SENSNAME: value, // fwl

        SENSCASE: value // low
    }
    A flat structure with an optional group name seems better. Added that conversion in this script.

    Additionaly, sensitivity information should probably be handled separately. Currently it is just treaded as two parameters (SENSNAME AND SENSCASE)

    """
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"match": {"_sumo.parent_object.keyword": case_id}},
                    {"match": {"fmu.iteration.name": iteration}},
                ]
            }
        },
        "aggs": {
            "realization": {
                "terms": {
                    "field": "fmu.realization.id",
                    "size": 999999,
                },
                "aggs": {
                    "top_docs": {
                        "top_hits": {
                            "size": 1,
                        }
                    },
                },
            },
        },
    }
    response = sumo_client.post("/search", json=query)

    result = response.json()
    parameter_ensemble_records: Dict = {}
    for realization in result.get("aggregations").get("realization").get("buckets"):
        realization_metadata = (
            realization.get("top_docs").get("hits").get("hits")[0].get("_source").get("fmu").get("realization")
        )
        parameter_realization_records = realization_metadata.get("parameters")

        # Loop through each parameter for the realization
        for key, value in parameter_realization_records.items():
            # If the parameter is a group, loop through each sub parameter
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    if parameter_ensemble_records.get(sub_key) is None:
                        parameter_ensemble_records[sub_key] = {"REAL": [], "values": [], "group_name": key}
                    parameter_ensemble_records[sub_key]["REAL"].append(realization_metadata.get("id"))
                    parameter_ensemble_records[sub_key]["values"].append(sub_value)
            else:
                if parameter_ensemble_records.get(key) is None:
                    parameter_ensemble_records[key] = {"REAL": [], "values": [], "group_name": None}
                parameter_ensemble_records[key]["REAL"].append(realization_metadata.get("id"))
                parameter_ensemble_records[key]["values"].append(value)

    sumo_ensemble_parameters: List[SumoEnsembleParameter] = []

    for parameter_name, parameter in parameter_ensemble_records.items():
        sumo_ensemble_parameters.append(
            SumoEnsembleParameter(
                name=parameter_name,
                values=parameter.get("values"),
                realizations=parameter.get("REAL"),
                groupname=parameter.get("group_name"),
            )
        )

    return sumo_ensemble_parameters
