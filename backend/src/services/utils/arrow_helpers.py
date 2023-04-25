import pyarrow as pa


def sort_table_on_real_then_date(table: pa.Table) -> pa.Table:
    return table.sort_by([("REAL", "ascending"), ("DATE", "ascending")])


def create_float_downcasting_schema(schema: pa.Schema) -> pa.Schema:
    dt_float64 = pa.float64()
    dt_float32 = pa.float32()
    types = schema.types
    for idx, typ in enumerate(types):
        if typ == dt_float64:
            types[idx] = dt_float32

    field_list = zip(schema.names, types)
    return pa.schema(field_list)


def set_date_column_type_to_timestamp_ms(schema: pa.Schema) -> pa.Schema:
    dt_timestamp_ms = pa.timestamp("ms")

    indexof_date_field = schema.get_field_index("DATE")

    types = schema.types
    types[indexof_date_field] = dt_timestamp_ms

    field_list = zip(schema.names, types)
    return pa.schema(field_list)


def set_real_column_type_to_int16(schema: pa.Schema) -> pa.Schema:
    dt_int16 = pa.int16()

    indexof_real_field = schema.get_field_index("REAL")
    types = schema.types
    types[indexof_real_field] = dt_int16

    field_list = zip(schema.names, types)
    return pa.schema(field_list)
