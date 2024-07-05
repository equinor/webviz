from typing import List

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsIndex
from primary.services.sumo_access.inplace_volumetrics_types import InplaceVolumetricTableDataPerFluidSelection

from . import schemas


def api_category_filter_to_sumo_category_filter(
    categories: List[schemas.InplaceVolumetricsIndex],
) -> List[InplaceVolumetricsIndex]:
    """Converts the category filter from the API to the format expected by the sumo service"""
    return [InplaceVolumetricsIndex(**category.model_dump()) for category in categories]


def convert_table_data_per_fluid_selection_to_schema(
    table_per_fluid_selection: InplaceVolumetricTableDataPerFluidSelection,
) -> schemas.InplaceVolumetricTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: List[schemas.InplaceVolumetricTableData] = []

    for table in table_per_fluid_selection.table_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                column_name=column.column_name,
                unique_values=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        response_columns = [
            schemas.TableColumnData(column_name=column.column_name, column_values=column.values)
            for column in table.response_columns
        ]

        tables.append(
            schemas.InplaceVolumetricTableData(
                fluid_selection_name=table.fluid_selection_name,
                selector_columns=selector_columns,
                response_columns=response_columns,
            )
        )

    return schemas.InplaceVolumetricTableDataPerFluidSelection(table_per_fluid_selection=tables)
