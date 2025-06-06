from primary.services.sumo_access.inplace_volumetrics_types import (
    Statistic,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
)

from .. import schemas


##############################################################################################################################
#
# Internal reusable functions for converting table data
#
################################################################################################################################


def _convert_table_data_per_fluid_selection_to_schema(
    table_per_fluid_selection: InplaceVolumetricTableDataPerFluidSelection | InplaceVolumesTableDataPerFluidSelection,
) -> schemas.InplaceVolumesTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: list[schemas.InplaceVolumesTableData] = []

    for table in table_per_fluid_selection.table_data_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                columnName=column.column_name,
                uniqueValues=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        result_columns = [
            schemas.TableColumnData(columnName=column.column_name, columnValues=column.values)
            for column in table.result_columns
        ]

        tables.append(
            schemas.InplaceVolumesTableData(
                fluidSelectionName=table.fluid_selection_name,
                selectorColumns=selector_columns,
                resultColumns=result_columns,
            )
        )

    return schemas.InplaceVolumesTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def _convert_statistical_table_data_per_fluid_selection_to_schema(
    table_data_per_fluid_selection: InplaceStatisticalVolumetricTableDataPerFluidSelection
    | InplaceVolumesStatisticalTableDataPerFluidSelection,
) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: list[schemas.InplaceVolumesStatisticalTableData] = []

    for table in table_data_per_fluid_selection.table_data_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                columnName=column.column_name,
                uniqueValues=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        result_columns_statistics = [
            schemas.TableColumnStatisticalData(
                columnName=column.column_name,
                statisticValues=_convert_statistic_values_dict_to_schema(column.statistic_values),
            )
            for column in table.result_column_statistics
        ]

        tables.append(
            schemas.InplaceVolumesStatisticalTableData(
                fluidSelectionName=table.fluid_selection_name,
                selectorColumns=selector_columns,
                resultColumnStatistics=result_columns_statistics,
            )
        )

    return schemas.InplaceVolumesStatisticalTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def _convert_statistic_values_dict_to_schema(
    statistic_values: dict[Statistic, list[float]],
) -> dict[schemas.InplaceVolumesStatistic, list[float]]:
    """Converts the statistic values dictionary from the service layer format to API format"""
    return {
        _convert_statistic_enum_to_inplace_volumetric_statistic_enum(statistic): values
        for statistic, values in statistic_values.items()
    }


def _convert_statistic_enum_to_inplace_volumetric_statistic_enum(
    statistic: Statistic,
) -> schemas.InplaceVolumesStatistic:
    """Converts the statistic enum from the service layer format to API enum"""
    if statistic == Statistic.MEAN:
        return schemas.InplaceVolumesStatistic.MEAN
    if statistic == Statistic.STD_DEV:
        return schemas.InplaceVolumesStatistic.STD_DEV
    if statistic == Statistic.MIN:
        return schemas.InplaceVolumesStatistic.MIN
    if statistic == Statistic.MAX:
        return schemas.InplaceVolumesStatistic.MAX
    if statistic == Statistic.P10:
        return schemas.InplaceVolumesStatistic.P10
    if statistic == Statistic.P90:
        return schemas.InplaceVolumesStatistic.P90

    raise ValueError(f"Unhandled statistic value: {statistic.value}")
