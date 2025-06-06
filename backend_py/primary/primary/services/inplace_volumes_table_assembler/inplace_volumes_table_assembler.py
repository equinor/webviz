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
    get_calculated_volumes_among_result_names,
    get_fluid_from_string,
    get_fluid_from_selection,
    get_index_column_from_string,
    get_properties_among_result_names,
    get_required_volume_names_from_calculated_volumes,
    get_required_volume_names_from_properties,
)

from ._utils import (
    create_calculated_volume_column_expressions,
    create_property_column_expressions,
    create_inplace_volumes_summed_fluids_df,
    create_grouped_statistical_result_table_data_polars,
    create_inplace_volumes_df_per_fluid,
    create_per_group_summed_realization_volume_df,
    create_inplace_volumetric_table_data_from_result_df,
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
        fluids: list[InplaceVolumes.Fluid],
        indices_with_values: list[InplaceVolumesIndexWithValues],
        group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
        realizations: list[int] | None,
        accumulate_fluids: bool = False,
    ) -> InplaceVolumesTableDataPerFluidSelection:
        if group_by_indices == []:
            raise InvalidParameterError("Group by indices must be non-empty list or None", Service.GENERAL)
        if realizations == []:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        # Create volume df per fluid and retrieve volume names and valid properties among requested result names
        (
            volume_df_per_fluid_selection,
            categorized_requested_result_names,
        ) = await self._get_volume_df_per_fluid_selection_and_categorized_result_names_async(
            table_name, result_names, fluids, realizations, indices_with_values, accumulate_fluids
        )

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_indices
        table_data_per_fluid_selection: list[InplaceVolumesTableData] = []
        for fluid_selection, volume_df in volume_df_per_fluid_selection.items():
            if "REAL" not in volume_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)

            # Create per group summed realization values
            per_group_summed_realization_df = create_per_group_summed_realization_volume_df(volume_df, group_by_indices)

            # Create result df - requested volumes and calculated properties
            per_realization_accumulated_result_df = InplaceVolumesTableAssembler._create_result_dataframe_polars(
                per_group_summed_realization_df, categorized_requested_result_names, fluid_selection
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
        fluids: list[InplaceVolumes.Fluid],
        indices_with_values: list[InplaceVolumesIndexWithValues],
        group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
        realizations: list[int] | None,
        accumulate_fluids: bool = False,
    ) -> InplaceVolumesStatisticalTableDataPerFluidSelection:
        if group_by_indices == []:
            raise InvalidParameterError("Group by indices must be non-empty list or None", Service.GENERAL)
        if realizations == []:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        # Create volume df per fluid and retrieve volume names and valid properties among requested result names
        (
            volume_df_per_fluid_selection,
            categorized_requested_result_names,
        ) = await self._get_volume_df_per_fluid_selection_and_categorized_result_names_async(
            table_name, result_names, fluids, realizations, indices_with_values, accumulate_fluids
        )

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_indices
        statistical_table_data_per_fluid_selection: list[InplaceVolumesStatisticalTableData] = []
        for fluid_selection, volume_df in volume_df_per_fluid_selection.items():
            if "REAL" not in volume_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)

            # Create per group summed realization values
            per_group_summed_realization_df = create_per_group_summed_realization_volume_df(volume_df, group_by_indices)

            # Create result df - requested volumes and calculated properties
            per_realization_accumulated_result_df = InplaceVolumesTableAssembler._create_result_dataframe_polars(
                per_group_summed_realization_df, categorized_requested_result_names, fluid_selection
            )

            # Create statistical table data from df
            selector_column_data_list, result_column_data_list = create_grouped_statistical_result_table_data_polars(
                per_realization_accumulated_result_df,
                group_by_indices,
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

    async def _get_volume_df_per_fluid_selection_and_categorized_result_names_async(
        self,
        table_name: str,
        result_names: set[str],
        fluids: list[InplaceVolumes.Fluid],
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues],
        accumulate_fluids: bool,
    ) -> tuple[dict[FluidSelection, pl.DataFrame], CategorizedResultNames]:
        """
        Utility function to get volume table data as pl.DataFrame per fluid selection, and a list of volume names and properties among the requested result names.

        The function returns a dictionary with fluid selection as key and a volumetric DataFrame as value. The volumetric DataFrame contains the requested
        volume names among result names, and all necessary volumes to calculate properties.

        Note: If accumulate_fluids is True, the function will exclude BO and BG from valid properties.

        Calculation of volume names and properties, and creation of the results is handled outside this function.
        """
        # Check for empty identifier selections
        has_empty_index_selection = any(not index_with_values.values for index_with_values in indices_with_values)
        if has_empty_index_selection:
            raise InvalidParameterError(
                "Each provided index column must have at least one selected value", Service.GENERAL
            )

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_among_result_names(result_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Detect calculated volumes among result names and find volume names needed for calculation
        calculated_volume_names = get_calculated_volumes_among_result_names(result_names)
        required_volume_names_for_calculated_volumes = get_required_volume_names_from_calculated_volumes(
            calculated_volume_names
        )

        # Extract volume names among result names
        volume_names = list(set(result_names) - set(properties) - set(calculated_volume_names))

        # Find all volume names needed from Sumo
        all_volume_names = set(
            volume_names + required_volume_names_for_properties + required_volume_names_for_calculated_volumes
        )

        # Get volume table per fluid selection - requested volumes and volumes needed for properties
        volume_df_per_fluid_selection: dict[
            FluidSelection, pl.DataFrame
        ] = await self._create_volume_df_per_fluid_selection(
            table_name, all_volume_names, fluids, realizations, indices_with_values, accumulate_fluids
        )

        # If accumulate_fluids is True, exclude BO and BG from valid properties
        valid_properties = properties
        if accumulate_fluids:
            valid_properties = [prop for prop in properties if prop not in [Property.BO, Property.BG]]

        return volume_df_per_fluid_selection, CategorizedResultNames(
            volume_names=volume_names, calculated_volume_names=calculated_volume_names, property_names=valid_properties
        )

    @staticmethod
    def _create_result_dataframe_polars(
        volume_df: pl.DataFrame,
        categorized_requested_result_names: CategorizedResultNames,
        fluid_selection: FluidSelection,
    ) -> pl.DataFrame:
        """
        Create a result dataframe from the volume table and requested result names (volumes, calculated volumes, and calculated properties).

        If volume names needed for properties are not available in the volume dataframe, the function will skip the property

        The result dataframe contains the requested volume names, calculated volumes and calculated properties
        """
        # Convert fluid selection to fluid zone
        fluid: InplaceVolumes.Fluid | None = get_fluid_from_selection(fluid_selection)

        # Find valid selector columns and volume names
        possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()
        available_selector_columns = [col for col in possible_selector_columns if col in volume_df.columns]
        requested_volume_names = categorized_requested_result_names.volume_names
        available_requested_volume_names = [name for name in requested_volume_names if name in volume_df.columns]

        # Create calculated volume column expressions
        requested_calculated_volume_names = categorized_requested_result_names.calculated_volume_names
        calculated_volume_column_expressions: list[pl.Expr] = create_calculated_volume_column_expressions(
            volume_df.columns, requested_calculated_volume_names, fluid
        )

        # Create property column expressions
        requested_properties = categorized_requested_result_names.property_names
        property_column_expressions: list[pl.Expr] = create_property_column_expressions(
            volume_df.columns, requested_properties, fluid
        )

        # Create result dataframe, select columns and calculate volumes + properties
        column_names_and_expressions = (
            available_selector_columns
            + available_requested_volume_names
            + calculated_volume_column_expressions
            + property_column_expressions
        )
        result_df = volume_df.select(column_names_and_expressions)

        return result_df

    async def _create_volume_df_per_fluid_selection(
        self,
        table_name: str,
        volume_names: set[str],
        fluids: list[InplaceVolumes.Fluid],
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues] = [],
        accumulate_fluids: bool = False,
    ) -> dict[FluidSelection, pl.DataFrame]:
        """
        This function creates a volumetric DataFrame per fluid selection

        The requested volume names are the set of result names and necessary result names to calculate properties.
        Calculation of properties are handled outside this function.

        The dataframe is created by filtering the raw volumetric table based on the identifiers and realizations and then
        accumulate the volumes across fluid zones.

        Input:
        - table_name: str - Name of the table in Sumo
        - volume_names: set[str] - All volume names needed from Sumo, including volume names needed for properties
        - fluids: list[InplaceVolumes.Fluid] - Fluids to create inplace volumes tables for
        - realizations: list[int] - Realizations to include in the volumetric table
        - indices_with_values: list[InplaceVolumesIndexWithValues] - Index values to filter the inplace volumes table, i.e. row filtering
        - accumulate_fluids: bool - Whether to accumulate the volumes across fluids
        """

        if not volume_names or not fluids:
            return {}

        timer = PerfTimer()

        # Get the inplace volumes table as DataFrame, filtered on indices and realizations
        volumes_table_df: pl.DataFrame = await self._get_inplace_volumes_table_as_polars_df_async(
            table_name=table_name, volume_columns=set(volume_names)
        )
        row_filtered_volumes_table_df = InplaceVolumesTableAssembler._create_row_filtered_volumes_table_df(
            table_name=table_name,
            inplace_volumes_table_df=volumes_table_df,
            fluids=fluids,
            realizations=realizations,
            indices_with_values=indices_with_values,
        )

        if row_filtered_volumes_table_df is None:
            # No data found for the given indices and realizations
            return {}

        timer_create_row_filtered_df = timer.lap_ms()
        print(f"Time creating row filtered DataFrame: {timer_create_row_filtered_df}ms")

        # Create inplace volumes table DataFrame per fluid selection
        volume_df_per_fluid_selection: dict[FluidSelection, pl.DataFrame] = {}
        if accumulate_fluids and len(fluids) > 1:
            # Build volume df summed across fluid zones
            volumetric_summed_fluid_zones_df = create_inplace_volumes_summed_fluids_df(row_filtered_volumes_table_df)

            volume_df_per_fluid_selection[FluidSelection.ACCUMULATED] = volumetric_summed_fluid_zones_df
            return volume_df_per_fluid_selection

        # Handle each fluid zone separately
        volumes_df_per_fluid: dict[InplaceVolumes.Fluid, pl.DataFrame] = create_inplace_volumes_df_per_fluid(
            row_filtered_volumes_table_df
        )

        # Build volume df per fluid selection
        for fluid, volume_df in volumes_df_per_fluid.items():
            fluid_selection = convert_fluid_to_fluid_selection(fluid)
            volume_df_per_fluid_selection[fluid_selection] = volume_df

        return volume_df_per_fluid_selection

    @staticmethod
    def _create_row_filtered_volumes_table_df(
        table_name: str,
        inplace_volumes_table_df: pl.DataFrame,
        fluids: list[InplaceVolumes.Fluid],
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

        if not fluids:
            raise InvalidParameterError("Fluids must be a non-empty list", Service.GENERAL)

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

        # Add mask for selected fluids
        if InplaceVolumes.TableIndexColumns.FLUID.value in column_names:
            fluid_strings = [fluid.value for fluid in fluids]
            fluid_mask = inplace_volumes_table_df[InplaceVolumes.TableIndexColumns.FLUID.value].is_in(fluid_strings)
            mask = mask & fluid_mask

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
        inplace_volumes_table_df = remove_invalid_optional_index_columns(inplace_volumes_table_df)

        return inplace_volumes_table_df
