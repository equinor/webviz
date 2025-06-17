from primary.services.sumo_access.inplace_volumetrics_types import (
    Statistic as InplaceVolumetricsStatistic,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from primary.services.sumo_access.inplace_volumes_table_types import (
    Statistic as InplaceVolumesStatistic,
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
)

from .. import schemas


##############################################################################################################################
#
# Internal reusable functions for converting table data
#
################################################################################################################################


def convert_table_data_per_fluid_selection_to_schema(
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
                fluidSelection=table.fluid_selection,
                selectorColumns=selector_columns,
                resultColumns=result_columns,
            )
        )

    return schemas.InplaceVolumesTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def convert_statistical_table_data_per_fluid_selection_to_schema(
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
                fluidSelection=table.fluid_selection,
                selectorColumns=selector_columns,
                resultColumnStatistics=result_columns_statistics,
            )
        )

    return schemas.InplaceVolumesStatisticalTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def _convert_statistic_values_dict_to_schema(
    statistic_values: dict[InplaceVolumesStatistic, list[float]] | dict[InplaceVolumetricsStatistic, list[float]]
) -> dict[schemas.InplaceVolumesStatistic, list[float]]:
    """Converts the statistic values dictionary from the service layer format to API format"""
    return {
        _convert_statistic_enum_to_inplace_volumetric_statistic_enum(statistic): values
        for statistic, values in statistic_values.items()
    }


def _convert_statistic_enum_to_inplace_volumetric_statistic_enum(
    statistic: InplaceVolumesStatistic | InplaceVolumetricsStatistic,
) -> schemas.InplaceVolumesStatistic:
    """Converts the statistic enum from the service layer format to API enum"""
    if statistic == InplaceVolumesStatistic.MEAN or statistic == InplaceVolumetricsStatistic.MEAN:
        return schemas.InplaceVolumesStatistic.MEAN
    if statistic == InplaceVolumesStatistic.STD_DEV or statistic == InplaceVolumetricsStatistic.STD_DEV:
        return schemas.InplaceVolumesStatistic.STD_DEV
    if statistic == InplaceVolumesStatistic.MIN or statistic == InplaceVolumetricsStatistic.MIN:
        return schemas.InplaceVolumesStatistic.MIN
    if statistic == InplaceVolumesStatistic.MAX or statistic == InplaceVolumetricsStatistic.MAX:
        return schemas.InplaceVolumesStatistic.MAX
    if statistic == InplaceVolumesStatistic.P10 or statistic == InplaceVolumetricsStatistic.P10:
        return schemas.InplaceVolumesStatistic.P10
    if statistic == InplaceVolumesStatistic.P90 or statistic == InplaceVolumetricsStatistic.P90:
        return schemas.InplaceVolumesStatistic.P90

    raise ValueError(f"Unhandled statistic value: {statistic.value}")
