import datetime
from io import BytesIO
from typing import List, Optional, Sequence

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from ._arrow_helpers import create_float_downcasting_schema, set_date_column_type_to_timestamp_ms, set_real_column_type_to_int16
from ._field_metadata import create_vector_metadata_from_field_meta
from ._helpers import create_sumo_client_instance
from ._resampling import resample_segmented_multi_real_table
from .types import Frequency, RealizationVector


class SummaryAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)

        self._case_uuid = case_uuid
        self._iteration_name = iteration_name

        # Right now, we need both iteration name and id, but this will not last
        # For now, just do a hack to extract the ID from the name
        iter_id = 0
        try:
            dash_idx = iteration_name.rindex("-")
            iter_id = int(iteration_name[dash_idx + 1 :])
        except:
            pass

        self._iteration_id = iter_id

    def get_vector_names(self) -> List[str]:
        case_collection = CaseCollection(self._sumo_client).filter(id=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        # Currently it seems we have to filter on tagname using the iteration name in
        # order to qualify actually get the smry vectors
        maybe_smry_table_collection = case.tables.filter(operation="collection", iteration=self._iteration_id, tagname=self._iteration_name)

        vec_names = maybe_smry_table_collection.names
        return vec_names

    def get_vector_table(
        self, vector_name: str, resampling_frequency: Optional[Frequency], realizations: Optional[Sequence[int]]
    ) -> pa.Table:
        """
        Get pyarrow.Table containing values for the specified vector.
        The returned table will always contain a 'DATE' and 'REAL' column in addition to the requested vector.
        The 'DATE' column will be of type timestamp[ms] and the 'REAL' column will be of type int16.
        The vector column will be of type float.
        If `resampling_frequency` is None, the data will be returned with full/raw resolution.
        """
        case_collection = CaseCollection(self._sumo_client).filter(id=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        # Currently it seems we have to filter on tagname using the iteration name in
        # order to qualify actually get the smry vectors
        maybe_smry_table_collection = case.tables.filter(
            name=[vector_name, "DATE"],
            operation="collection",
            iteration=self._iteration_id,
            tagname=self._iteration_name,
        )
        assert len(maybe_smry_table_collection) == 2

        # We don't know the order of the tables within the collection :-(
        if maybe_smry_table_collection[0].name == "DATE":
            date_sumo_table = maybe_smry_table_collection[0]
            vec_sumo_table = maybe_smry_table_collection[1]
        else:
            vec_sumo_table = maybe_smry_table_collection[0]
            date_sumo_table = maybe_smry_table_collection[1]

        date_arrow_bytes: BytesIO = date_sumo_table.blob
        # date_arrow_bytes = sumo_client.get(f"/objects('{date_table.id}')/blob")
        with pa.ipc.open_file(date_arrow_bytes) as reader:
            date_arrow_table = reader.read_all()

        vec_arrow_bytes: BytesIO = vec_sumo_table.blob
        # vec_arrow_bytes = sumo_client.get(f"/objects('{vec_table.id}')/blob")
        with pa.ipc.open_file(vec_arrow_bytes) as reader:
            vec_arrow_table = reader.read_all()

        # Create the combined table for the vector.
        # After this we expect the table to have the following columns: DATE, REAL, <vector_name>
        table = vec_arrow_table.add_column(0, "DATE", date_arrow_table["DATE"])

        # Our assumption is that the reconstructed table is segmented on REAL and that within each segment, the DATE
        # column is sorted. We may want to add some checks here to verify this assumption since the resampling algorithm
        # below assumes this and will fail if it is not true.

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)

        # Until SUMO gets the datatypes right, do the casting here
        schema = table.schema
        schema = set_date_column_type_to_timestamp_ms(schema)
        schema = create_float_downcasting_schema(schema)
        schema = set_real_column_type_to_int16(schema)
        table = table.cast(schema)

        if resampling_frequency is not None:
            table = resample_segmented_multi_real_table(table, resampling_frequency)

        # Should we always combine the chunks?
        table = table.combine_chunks()

        return table

    def get_vector(
        self, vector_name: str, resampling_frequency: Optional[Frequency], realizations: Optional[Sequence[int]]
    ) -> List[RealizationVector]:

        table = self.get_vector_table(vector_name, resampling_frequency, realizations)

        # Retrieve vector metadata from the field's metadata
        # Unfortunately it seems that currently the data we get from SUMO does not have this metadata
        field = table.schema.field(vector_name)
        vector_metadata = create_vector_metadata_from_field_meta(field)

        real_arr_np = table.column("REAL").to_numpy()
        unique_reals, first_occurrence_idx, real_counts = np.unique(real_arr_np, return_index=True, return_counts=True)

        whole_date_np_arr = table.column("DATE").to_numpy()
        whole_value_np_arr = table.column(vector_name).to_numpy()

        ret_arr: List[RealizationVector] = []
        for i, real in enumerate(unique_reals):
            start_row_idx = first_occurrence_idx[i]
            row_count = real_counts[i]
            date_np_arr = whole_date_np_arr[start_row_idx : start_row_idx + row_count]
            value_np_arr = whole_value_np_arr[start_row_idx : start_row_idx + row_count]

            ret_arr.append(
                RealizationVector(
                    realization=real,
                    timestamps=date_np_arr.astype(datetime.datetime).tolist(),
                    values=value_np_arr.tolist(),
                    metadata=vector_metadata,
                )
            )

        return ret_arr
