from typing import List
from io import BytesIO
import datetime
from pydantic import BaseModel
import numpy as np
import pyarrow as pa

from ._helpers import create_sumo_client_instance
from ._arrow_helpers import create_float_downcasting_schema
from ._arrow_helpers import set_date_column_type_to_timestamp_ms
from ._arrow_helpers import set_real_column_type_to_int16

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient


class VectorRealizationData(BaseModel):
    realization: int
    timestamps: List[datetime.datetime]
    values: List[float]


class SummaryAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name

        # Right now, we need both iteration name and id, but this will not last
        # For now, just do a hack to extract the ID from the name
        iter_id = 0
        try:
            dash_idx =  iteration_name.rindex("-")
            iter_id = int(iteration_name[dash_idx + 1:])
        except:
            pass

        self._iteration_id = iter_id


    def get_vector_names(self) -> List[str]:
        case_collection = CaseCollection(self._sumo_client).filter(id=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._iter_spec.case_uuid=}")

        case = case_collection[0]

        # Currently it seems we have to filter on tagname using the iteration name in
        # order to qualify actually get the smry vectors
        maybe_smry_table_collection = case.tables.filter(operation="collection", iteration=self._iteration_id, tagname=self._iteration_name)

        vec_names = maybe_smry_table_collection.names
        return vec_names


    def get_vector_realizations_data_as_arrow_table(self, vector_name: str) -> pa.Table:
        case_collection = CaseCollection(self._sumo_client).filter(id=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        # Currently it seems we have to filter on tagname using the iteration name in
        # order to qualify actually get the smry vectors
        maybe_smry_table_collection = case.tables.filter(name=[vector_name, "DATE"], operation="collection", iteration=self._iteration_id, tagname=self._iteration_name)
        assert(len(maybe_smry_table_collection) == 2)

        # We don't know the order of the tables within the collection :-(
        if maybe_smry_table_collection[0].name == "DATE":
            date_sumo_table = maybe_smry_table_collection[0]
            vec_sumo_table = maybe_smry_table_collection[1]
        else:
            vec_sumo_table = maybe_smry_table_collection[0]
            date_sumo_table = maybe_smry_table_collection[1]

        date_arrow_bytes:BytesIO = date_sumo_table.blob
        #date_arrow_bytes = sumo_client.get(f"/objects('{date_table.id}')/blob")
        with pa.ipc.open_file(date_arrow_bytes) as reader:
            date_arrow_table = reader.read_all()

        vec_arrow_bytes:BytesIO = vec_sumo_table.blob
        #vec_arrow_bytes = sumo_client.get(f"/objects('{vec_table.id}')/blob")
        with pa.ipc.open_file(vec_arrow_bytes) as reader:
            vec_arrow_table = reader.read_all()

        ret_table = vec_arrow_table.add_column(0, "DATE", date_arrow_table["DATE"])

        schema = ret_table.schema
        schema = set_date_column_type_to_timestamp_ms(schema)
        schema = create_float_downcasting_schema(schema)
        schema = set_real_column_type_to_int16(schema)
        ret_table = ret_table.cast(schema)

        return ret_table


    def get_vector_realizations_data(self, vector_name: str) -> List[VectorRealizationData]:
        table = self.get_vector_realizations_data_as_arrow_table(vector_name)
        real_arr_np = table.column("REAL").to_numpy()
        unique_reals, first_occurrence_idx, real_counts = np.unique(real_arr_np, return_index=True, return_counts=True)

        whole_date_np_arr = table.column("DATE").to_numpy()
        whole_value_np_arr = table.column(vector_name).to_numpy()

        ret_arr: List[VectorRealizationData] = []
        for i, real in enumerate(unique_reals):
            start_row_idx = first_occurrence_idx[i]
            row_count = real_counts[i]
            date_np_arr = whole_date_np_arr[start_row_idx : start_row_idx + row_count]
            value_np_arr = whole_value_np_arr[start_row_idx : start_row_idx + row_count]

            ret_arr.append(VectorRealizationData(realization=real, timestamps=date_np_arr.astype(datetime.datetime).tolist(), values=value_np_arr.tolist()))

        return ret_arr
