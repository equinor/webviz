import asyncio

from typing import Any

import pyarrow as pa
import polars as pl

from primary.services.sumo_access.inplace_volumes_table_access import (
    InplaceVolumesTableAccess,
    IGNORED_INDEX_COLUMN_VALUES,
)
from primary.services.sumo_access.inplace_volumes_table_types import (
    CategorizedResultNames,
    FluidSelection,
    Property,
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
    InplaceVolumesTableDefinition,
    InplaceVolumesStatisticalTableData,
    InplaceVolumesTableDefinition,
    InplaceVolumesTableData,
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
    VolumeColumnsAndIndexUniqueValues,
)
from primary.services.service_exceptions import Service, InvalidDataError, InvalidParameterError, NoDataError

from ._conversion._conversion import (
    create_fluid_selection_name,
    convert_fluid_to_fluid_selection,
    get_available_calculated_volumes_from_volume_names,
    get_available_properties_from_volume_names,
    get_fluid_from_string,
    get_fluid_from_selection,
    get_index_column_from_string,
)

from ._utils import (
    create_calculated_volume_column_expressions,
    create_property_column_expressions,
    create_inplace_volumes_summed_fluids_df,
    create_grouped_statistical_result_table_data_polars,
    create_inplace_volumes_df_per_fluid,
    create_per_group_summed_realization_volumes_df,
    create_inplace_volumetric_table_data_from_result_df,
    get_required_volume_names_and_categorized_result_names,
    get_valid_result_names_from_list,
    remove_invalid_optional_index_columns,
)


import logging
from webviz_pkg.core_utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


class InplaceVolumesTableAssembler:
    """
    This class provides an interface for interacting with definitions used in front-end for assembling and providing
    metadata and inplace volumes table data

    The class interacts with the InplaceVolumesTableAccess class to retrieve data from Sumo and assemble it into a format
    that can be used in the front-end. It also performs validation of the data and aggregation methods where needed.

    The assembler contains conversion from result names (volume columns, properties and calculated volumes) into volumetric columns
    needed to be fetched from Sumo, and then assembles back the results into a format that can be used in the front-end.

    Front-end:
    - results = volume columns + properties + calculated volumes

    Back-end:
    - Volume columns: Regular volumetric columns, i.e. the columns that are directly available in Sumo
    - Properties: Derived from volume columns
    - Calculated volumes: Derived from volume columns

    Fetches all volumetric columns needed from Sumo, i.e. including columns needed to derive properties and calculated volumes.

    """

    def __init__(self, inplace_volumes_access: InplaceVolumesTableAccess):
        self._inplace_volumes_table_access = inplace_volumes_access

    async def get_inplace_volumes_tables_metadata_async(self) -> list[InplaceVolumesTableDefinition]:
        vol_table_names = await self._inplace_volumes_table_access.get_inplace_volumes_table_names_async()

        # Get pair of requested table name, paired with its inplace volume columns and index columns with unique values
        async def get_table_name_with_volume_columns_and_index_unique_values_async(
            table_name: str,
        ) -> tuple[str, VolumeColumnsAndIndexUniqueValues]:
            return (
                table_name,
                await self._inplace_volumes_table_access.get_volume_columns_and_index_unique_values_async(table_name),
            )

        tasks = [
            asyncio.create_task(get_table_name_with_volume_columns_and_index_unique_values_async(vol_table_name))
            for vol_table_name in vol_table_names
        ]
        table_name_and_columns_meta_arr = await asyncio.gather(*tasks)

        tables_info: list[InplaceVolumesTableDefinition] = []
        for [table_name, columns_meta] in table_name_and_columns_meta_arr:
            index_columns_uniques_dict = columns_meta.index_unique_values_map
            volume_column_names = columns_meta.volume_columns

            unique_fluids = index_columns_uniques_dict.get(InplaceVolumes.TableIndexColumns.FLUID.value, [])
            fluids = [get_fluid_from_string(str(elm)) for elm in unique_fluids]
            valid_fluids = [elm for elm in fluids if elm is not None]

            calculated_volumes = get_available_calculated_volumes_from_volume_names(volume_column_names)
            available_property_names = get_available_properties_from_volume_names(volume_column_names)
            result_names = volume_column_names + calculated_volumes + available_property_names
            valid_result_names = get_valid_result_names_from_list(result_names)

            indices_with_values = []
            for [index_column_name, unique_values] in index_columns_uniques_dict.items():
                index_column = get_index_column_from_string(index_column_name)
                if index_column and unique_values != []:
                    indices_with_values.append(
                        InplaceVolumesIndexWithValues(
                            index=index_column,
                            values=unique_values,
                        )
                    )

            tables_info.append(
                InplaceVolumesTableDefinition(
                    table_name=table_name,
                    fluids=valid_fluids,
                    result_names=valid_result_names,
                    indices_with_values=indices_with_values,
                )
            )
        return tables_info

    async def create_accumulated_by_selection_per_realization_volumes_table_data_async(
        self,
        table_name: str,
        result_names: set[str],
        indices_with_values: list[InplaceVolumesIndexWithValues],
        group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
        realizations: list[int] | None,
    ) -> InplaceVolumesTableDataPerFluidSelection:
        """
        Create result table realization data per fluid selection, i.e. a table per fluid or a single table with all selected fluids accumulated.

        result_names = volume columns + properties + calculated volumes

        Get table from Sumo, with all requested volume columns, and all necessary columns to calculate properties and calculated volumes.
        Thereafter calculate the requested properties and calculated volumes, and aggregate the results by group_by_indices, before
        returning per realization data.
        """

        if group_by_indices == []:
            raise InvalidParameterError("Group by indices must be non-empty list or None", Service.GENERAL)
        if realizations == []:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        accumulate_fluids = group_by_indices is None or InplaceVolumes.TableIndexColumns.FLUID not in group_by_indices
        non_fluid_group_by = [elm for elm in group_by_indices if elm != InplaceVolumes.TableIndexColumns.FLUID]

        # Valid result names (exclude properties BO and BG if fluids are to be accumulated)
        valid_result_names = result_names
        if accumulate_fluids:
            valid_result_names = {r for r in result_names if r not in (Property.BO.value, Property.BG.value)}

        # Get all necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        required_volume_names, categorized_result_names = get_required_volume_names_and_categorized_result_names(
            valid_result_names
        )

        # Create volumes df filtered on indices values and realizations, for all required volumes, and present per fluid selection
        # - Volumes table for all necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        row_filtered_volumes_df_per_fluid_selection: dict[
            FluidSelection, pl.DataFrame
        ] = await self._get_row_filtered_volumes_df_per_fluid_selection_async(
            table_name, required_volume_names, realizations, indices_with_values, accumulate_fluids
        )

        fluid_values = next((elm.values for elm in indices_with_values if elm.index == InplaceVolumes.TableIndexColumns.FLUID), [])
        fluids = [InplaceVolumes.Fluid(fv) for fv in fluid_values]

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_indices
        table_data_per_fluid_selection: list[InplaceVolumesTableData] = []
        for fluid_selection, fluid_volumes_df in row_filtered_volumes_df_per_fluid_selection.items():
            if "REAL" not in fluid_volumes_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)

            # Create per group summed realization volumes
            per_group_summed_realization_volumes_df = create_per_group_summed_realization_volumes_df(
                fluid_volumes_df, non_fluid_group_by
            )

            # Create result df - requested volumes and calculated properties
            per_realization_accumulated_result_df = InplaceVolumesTableAssembler._create_results_dataframe_polars(
                per_group_summed_realization_volumes_df, categorized_result_names, fluid_selection
            )

            fluid_selection_name = create_fluid_selection_name(fluid_selection, fluids)

            table_data_per_fluid_selection.append(
                create_inplace_volumetric_table_data_from_result_df(
                    per_realization_accumulated_result_df, fluid_selection_name
                )
            )

        return InplaceVolumesTableDataPerFluidSelection(table_data_per_fluid_selection=table_data_per_fluid_selection)

    async def create_accumulated_by_selection_statistical_volumes_table_data_async(
        self,
        table_name: str,
        result_names: set[str],
        indices_with_values: list[InplaceVolumesIndexWithValues],
        group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
        realizations: list[int] | None,
    ) -> InplaceVolumesStatisticalTableDataPerFluidSelection:
        """
        Create result table statistical data per fluid selection, i.e. a table per fluid or a single table with all selected fluids accumulated.

        result_names = volume columns + properties + calculated volumes

        Get table from Sumo, with all requested volume columns, and all necessary columns to calculate properties and calculated volumes.
        Thereafter calculate the requested properties and calculated volumes, and aggregate the results by group_by_indices, before
        calculating statistics across realizations.
        """
        if group_by_indices == []:
            raise InvalidParameterError("Group by indices must be non-empty list or None", Service.GENERAL)
        if realizations == []:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        accumulate_fluids = group_by_indices is None or InplaceVolumes.TableIndexColumns.FLUID not in group_by_indices
        non_fluid_group_by = [elm for elm in group_by_indices if elm != InplaceVolumes.TableIndexColumns.FLUID]

        # Valid result names (exclude properties BO and BG if fluids are to be accumulated)
        valid_result_names = result_names
        if accumulate_fluids:
            valid_result_names = {r for r in result_names if r not in (Property.BO.value, Property.BG.value)}

        # Get all necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        required_volume_names, categorized_result_names = get_required_volume_names_and_categorized_result_names(
            valid_result_names
        )

        # Create volumes df filtered on indices values and realizations, for all required volumes, and present per fluid selection
        # - Volumes table for all necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        row_filtered_volumes_df_per_fluid_selection: dict[
            FluidSelection, pl.DataFrame
        ] = await self._get_row_filtered_volumes_df_per_fluid_selection_async(
            table_name, required_volume_names, realizations, indices_with_values, accumulate_fluids
        )


        fluid_values = next((elm.values for elm in indices_with_values if elm.index == InplaceVolumes.TableIndexColumns.FLUID), [])
        fluids = [InplaceVolumes.Fluid(fv) for fv in fluid_values]

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_indices
        statistical_table_data_per_fluid_selection: list[InplaceVolumesStatisticalTableData] = []
        for fluid_selection, fluid_volumes_df in row_filtered_volumes_df_per_fluid_selection.items():
            if "REAL" not in fluid_volumes_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)

            # Create per group summed realization values
            per_group_summed_realization_df = create_per_group_summed_realization_volumes_df(
                fluid_volumes_df, non_fluid_group_by
            )

            # Create result df - requested volumes and calculated properties
            per_realization_accumulated_result_df = InplaceVolumesTableAssembler._create_results_dataframe_polars(
                per_group_summed_realization_df, categorized_result_names, fluid_selection
            )

            # Create statistical table data from df
            selector_column_data_list, result_column_data_list = create_grouped_statistical_result_table_data_polars(
                per_realization_accumulated_result_df,
                non_fluid_group_by,
            )

            fluid_selection_name = create_fluid_selection_name(fluid_selection, fluids)

            statistical_table_data_per_fluid_selection.append(
                InplaceVolumesStatisticalTableData(
                    fluid_selection_name=fluid_selection_name,
                    selector_columns=selector_column_data_list,
                    result_column_statistics=result_column_data_list,
                )
            )

        return InplaceVolumesStatisticalTableDataPerFluidSelection(
            table_data_per_fluid_selection=statistical_table_data_per_fluid_selection
        )

    async def _get_row_filtered_volumes_df_per_fluid_selection_async(
        self,
        table_name: str,
        volume_names: set[str],
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues],
        accumulate_fluids: bool,
    ) -> dict[FluidSelection, pl.DataFrame]:
        """
        This function creates a volumes DataFrame per fluid selection

        The requested volume names is the set of volume columns, and necessary volume names to calculate properties and calculated volumes.
        Calculation of properties and calculated volumes are handled outside this function.

        The DataFrame is create by filtering the raw inplace volumes table on provided indices values and realizations, and then accumulate volumes
        across fluids.

        Input:
        - table_name: str - Name of the table in Sumo
        - volume_names: set[str] - All volume names needed from Sumo, including volume names needed for properties and calculated volumes
        - realizations: list[int] - Realizations to include in the volumetric table
        - indices_with_values: list[InplaceVolumesIndexWithValues] - Index values to filter the inplace volumes table, i.e. row filtering
        - accumulate_fluids: bool - Whether to accumulate the volumes across fluids
        """
        # Check for empty identifier selections
        has_empty_index_selection = any(not index_with_values.values for index_with_values in indices_with_values)
        if has_empty_index_selection:
            raise InvalidParameterError(
                "Each provided index column must have at least one selected value", Service.GENERAL
            )

        timer = PerfTimer()

        # Get the inplace volumes table as DataFrame, and create dataframe filtered on fluids, indices and realizations
        volumes_table_df: pl.DataFrame = await self._get_inplace_volumes_table_as_polars_df_async(
            table_name=table_name, volume_columns=volume_names
        )
        row_filtered_volumes_table_df = InplaceVolumesTableAssembler._create_row_filtered_volumes_table_df(
            table_name=table_name,
            inplace_volumes_table_df=volumes_table_df,
            realizations=realizations,
            indices_with_values=indices_with_values,
        )

        timer_create_row_filtered_df = timer.lap_ms()
        print(f"Time creating row filtered DataFrame: {timer_create_row_filtered_df}ms")

        # If no data is found for the given indices and realizations, return empty DataFrame
        if row_filtered_volumes_table_df is None:
            return {}

        if accumulate_fluids:
            # If fluids are to be accumulated - sum volumes across fluid zones
            return {FluidSelection.ACCUMULATED: create_inplace_volumes_summed_fluids_df(row_filtered_volumes_table_df)}

        # If grouping by fluid, we need to create a DataFrame per fluid
        volumes_df_per_fluid = create_inplace_volumes_df_per_fluid(row_filtered_volumes_table_df)

        # Build volume df per fluid selection
        volumes_df_per_fluid_selection: dict[FluidSelection, pl.DataFrame] = {}
        for fluid, fluid_volumes_df in volumes_df_per_fluid.items():
            fluid_selection = convert_fluid_to_fluid_selection(fluid)
            volumes_df_per_fluid_selection[fluid_selection] = fluid_volumes_df

        return volumes_df_per_fluid_selection

    async def _get_inplace_volumes_table_as_polars_df_async(
        self, table_name: str, volume_columns: set[str]
    ) -> pl.DataFrame:
        """
        Get the inplace volumes table as Polars DataFrame

        Table columns: index columns + requested `volume_columns`
        """

        # Get the inplace volumes table from collection in Sumo
        # - Will fail if requesting columns that are not available in the table
        inplace_volumes_table: pa.Table = (
            await self._inplace_volumes_table_access.get_inplace_volumes_aggregated_table_async(
                table_name, volume_columns
            )
        )

        # Remove index columns with invalid values
        inplace_volumes_table_df = pl.DataFrame(inplace_volumes_table)

        if inplace_volumes_table_df.is_empty():
            return inplace_volumes_table_df

        # For non-empty DataFrame, remove index columns with invalid values
        inplace_volumes_table_df = remove_invalid_optional_index_columns(inplace_volumes_table_df)
        return inplace_volumes_table_df

    @staticmethod
    def _create_results_dataframe_polars(
        volumes_df: pl.DataFrame,
        categorized_requested_result_names: CategorizedResultNames,
        fluid_selection: FluidSelection,
    ) -> pl.DataFrame:
        """
        Create a result dataframe from the volumes table and requested result names (volumes, calculated volumes, and calculated properties).

        If volume names needed for properties are not available in the volumes dataframe, the function will skip the property

        The result dataframe contains the requested volume names, calculated volumes and calculated properties
        """
        # Convert fluid selection to fluid zone
        fluid: InplaceVolumes.Fluid | None = get_fluid_from_selection(fluid_selection)

        # Find valid selector columns and volume names
        possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()
        available_selector_columns = [col for col in possible_selector_columns if col in volumes_df.columns]
        requested_volume_names = categorized_requested_result_names.volume_names
        available_requested_volume_names = [name for name in requested_volume_names if name in volumes_df.columns]

        # Create calculated volume column expressions
        requested_calculated_volume_names = categorized_requested_result_names.calculated_volume_names
        calculated_volume_column_expressions: list[pl.Expr] = create_calculated_volume_column_expressions(
            volumes_df.columns, requested_calculated_volume_names, fluid
        )

        # Create property column expressions
        requested_properties = categorized_requested_result_names.property_names
        property_column_expressions: list[pl.Expr] = create_property_column_expressions(
            volumes_df.columns, requested_properties, fluid
        )

        # Create result dataframe, select columns and calculate volumes + properties
        column_names_and_expressions = (
            available_selector_columns
            + available_requested_volume_names
            + calculated_volume_column_expressions
            + property_column_expressions
        )
        results_df = volumes_df.select(column_names_and_expressions)

        return results_df

    @staticmethod
    def _create_row_filtered_volumes_table_df(
        table_name: str,
        inplace_volumes_table_df: pl.DataFrame,
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues] = [],
    ) -> pl.DataFrame | None:
        """
        Create DataFrame filtered on indices values and realizations

        The function filters the provided inplace volumes table DataFrame based on the indices and realizations provided.
        If realizations is None, all realizations are included.
        """
        if realizations is not None and len(realizations) == 0:
            raise InvalidParameterError("Realizations must be a non-empty list or None", Service.GENERAL)

        column_names = inplace_volumes_table_df.columns

        # If any index column name is not found in the table, raise an error
        for elm in indices_with_values:
            index_column_name = elm.index.value
            if index_column_name not in column_names:
                raise InvalidDataError(
                    f"Index column name {index_column_name} not found in table {table_name}",
                    Service.GENERAL,
                )

        timer = PerfTimer()
        column_names = inplace_volumes_table_df.columns

        # Build mask for rows - default all rows
        num_rows = inplace_volumes_table_df.height
        mask = pl.Series([True] * num_rows)

        # Mask/filter out rows with ignored identifier values
        for index_name in InplaceVolumes.TableIndexColumns:
            if index_name.value in column_names:
                ignored_index_values_mask = inplace_volumes_table_df[index_name.value].is_in(
                    IGNORED_INDEX_COLUMN_VALUES
                )
                mask = mask & ~ignored_index_values_mask

        # Add mask for realizations
        if realizations is not None:
            # Check if every element in realizations exists in inplace_volumes_table_df["REAL"]
            real_values_set = set(inplace_volumes_table_df["REAL"].to_list())
            missing_realizations_set = set(realizations) - real_values_set

            if missing_realizations_set:
                raise NoDataError(
                    f"Missing data error. The following realization values do not exist in 'REAL' column: {list(missing_realizations_set)}",
                    Service.GENERAL,
                )

            realization_mask = inplace_volumes_table_df["REAL"].is_in(realizations)
            mask = mask & realization_mask

        # Add mask for each identifier filter
        for index_with_values in indices_with_values:
            if not index_with_values.values:
                mask = pl.Series([False] * num_rows)
                break

            index_column_name = index_with_values.index.value
            index_mask = inplace_volumes_table_df[index_column_name].is_in(index_with_values.values)
            mask = mask & index_mask

        filtered_df = inplace_volumes_table_df.filter(mask)
        time_row_filtering = timer.lap_ms()
        print(f"DATAFRAME row filtering (based on selectors): {time_row_filtering}ms")

        return filtered_df
