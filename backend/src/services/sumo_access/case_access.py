from typing import List, Optional
import datetime

import pandas as pd
from pydantic import BaseModel

from ._helpers import create_sumo_explorer_instance

from fmu.sumo.explorer import Explorer
from fmu.sumo.explorer.objects.case import Case

import pyarrow as pa


class VectorRealizationData(BaseModel):
    realization: int
    timestamps: List[datetime.datetime]
    values: List[float]


class CaseAccess:
    def __init__(self, access_token: str, sumo_case_id: str):
        self._sumo_explorer: Explorer = create_sumo_explorer_instance(access_token)
        self._sumo_case_id = sumo_case_id
        self._sumo_case_obj: Optional[Case] = None

    def _get_or_create_sumo_case_obj(self) -> Case:
        if self._sumo_case_obj:
            return self._sumo_case_obj

        self._sumo_case_obj = self._sumo_explorer.get_case_by_id(self._sumo_case_id)
        return self._sumo_case_obj

    def is_case_accessible(self) -> bool:
        if self._get_or_create_sumo_case_obj():
            return True

        return False

    def get_iterations(self) -> List[int]:
        sumo_case = self._get_or_create_sumo_case_obj()
        if not sumo_case:
            return []

        return sumo_case.get_iterations()

    def get_vector_names(self, iteration_id: str = "0") -> List[str]:

        hits = self._sumo_explorer._sumo.get(
            "/search",
            query=f"_sumo.parent_object:{self._sumo_case_id} AND \
                class:table AND \
                data.name:summary AND \
                fmu.iteration.id:{iteration_id} AND \
                fmu.realization.id:0",
            size=1,
            select="data.spec.columns",
        )["hits"]["hits"]
        if not hits:
            return []
        columns = hits[0]["_source"]["data"]["spec"]["columns"]
        return [col for col in columns if col not in ["YEARS", "DATE"]]

    def get_vector_realizations_data(self, vector_name: str, iteration_id: str = "0"):

        hits = self._sumo_explorer._sumo.get(
            "/search",
            query=f'_sumo.parent_object:{self._sumo_case_id} AND \
                class:table AND \
                data.name:"{vector_name}" AND \
                fmu.iteration.id:{iteration_id}',
            size=1,
            select=False,
        )["hits"]["hits"]
        if not hits:
            return None
        obj_uuid = hits[0]["_id"]
        arwfile = self._sumo_explorer._sumo.get(f"/objects('{obj_uuid}')/blob")
        with pa.ipc.open_file(arwfile) as reader:
            table = reader.read_pandas()
        print(table.head())
        date_table = self._get_timestamps_per_real_df(iteration_id)
        print(date_table.head())
        table["DATE"] = date_table["DATE"]
        table = table.fillna(0)
        data = []
        for real, df in table.groupby("REAL"):

            data.append(
                VectorRealizationData(realization=real, timestamps=df["DATE"].tolist(), values=df[vector_name].tolist())
            )
        return data

    def _get_timestamps_per_real_df(self, iteration_id: str = "0"):

        hits = self._sumo_explorer._sumo.get(
            "/search",
            query=f'_sumo.parent_object:{self._sumo_case_id} AND \
                class:table AND \
                data.name:"DATE" AND \
                fmu.iteration.id:{iteration_id}',
            size=1,
            select=False,
        )["hits"]["hits"]
        if not hits:
            return None
        obj_uuid = hits[0]["_id"]
        arwfile = self._sumo_explorer._sumo.get(f"/objects('{obj_uuid}')/blob")
        with pa.ipc.open_file(arwfile) as reader:
            table = reader.read_pandas()
        return table
