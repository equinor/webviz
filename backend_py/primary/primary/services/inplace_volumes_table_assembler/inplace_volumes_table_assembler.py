import asyncio

import pyarrow as pa
import polars as pl

from primary.services.sumo_access.inplace_volumes_table_access import (
    InplaceVolumesTableAccess,
    IGNORED_INDEX_COLUMN_VALUES,
)
from primary.services.sumo_access.inplace_volumes_table_types import (
    CategorizedResultNames,
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

from ._utils.conversion_utils import (
    create_inplace_volumes_table_data_from_fluid_results_df,
    get_available_calculated_volumes_from_volume_names,
    get_available_properties_from_volume_names,
    get_fluid_from_string,
    get_index_column_from_string,
    get_required_volume_names_and_categorized_result_names,
    get_valid_result_names_from_list,
)
from ._utils.inplace_results_df_utils import create_per_fluid_results_df, create_statistical_result_table_data_from_df
from ._utils.inplace_volumes_df_utils import (
    create_inplace_volumes_df_per_unique_fluid_value,
    remove_invalid_optional_index_columns,
    sum_inplace_volumes_by_indices_and_realizations_df,
    validate_inplace_volumes_df_selector_columns,
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
        Thereafter calculate the requested properties and calculated volumes, and sum the results by group_by_indices, before
        returning per realization data.
        """
        # Accumulated inplace volumes DataFrame: Get all necessary volumes, filter on indices values and realizations, and sum the volumes by
        # group_by_indices and realizations. Store DataFrame per unique fluid value in a dictionary.
        # - All necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        # - Fluid value: The unique fluid value for the DataFrame, e.g. "Oil", "Gas", "Water", or "Oil + Gas" (if fluids are accumulated)
        (
            accumulated_inplace_volumes_df_per_fluid_value,
            categorized_result_names,
        ) = await self._create_accumulated_inplace_volumes_df_per_fluid_and_categorized_result_names_async(
            table_name, result_names, group_by_indices, indices_with_values, realizations
        )

        # Create Results DataFrame from the Inplace Volumes DataFrame w/ all required volumes
        # - All necessary inplace volumes are retrieved, filtered by wanted index values and realizations, and accumulated by selected indices and realization.
        # - Create result DataFrame, i.e. calculate wanted properties and calculated volumes per fluid value.
        # - Provide inplace results api-data per fluid value.
        table_data_per_fluid_value: list[InplaceVolumesTableData] = []
        for fluid_value, accumulated_fluid_volumes_df in accumulated_inplace_volumes_df_per_fluid_value.items():
            if "REAL" not in accumulated_fluid_volumes_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)
            if InplaceVolumes.TableIndexColumns.FLUID.value in accumulated_fluid_volumes_df.columns:
                raise InvalidDataError(
                    "The DataFrame should not contain FLUID column when DataFrame is per unique fluid value",
                    Service.GENERAL,
                )

            # Create result df - requested volumes and calculated properties
            accumulated_result_df = create_per_fluid_results_df(
                accumulated_fluid_volumes_df, categorized_result_names, fluid_value
            )

            table_data_per_fluid_value.append(
                create_inplace_volumes_table_data_from_fluid_results_df(accumulated_result_df, fluid_value)
            )

        return InplaceVolumesTableDataPerFluidSelection(table_data_per_fluid_selection=table_data_per_fluid_value)

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
        Thereafter calculate the requested properties and calculated volumes, and accumulate the results by group_by_indices, before
        calculating statistics across realizations.
        """
        # Accumulated inplace volumes DataFrame: Get all necessary volumes, filter on indices values and realizations, and sum the volumes by
        # group_by_indices and realizations. Store DataFrame per unique fluid value in a dictionary.
        # - All necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        # - Fluid value: The unique fluid value for the DataFrame, e.g. "Oil", "Gas", "Water", or "Oil + Gas" (if fluids are accumulated)
        (
            accumulated_inplace_volumes_df_per_fluid_value,
            categorized_result_names,
        ) = await self._create_accumulated_inplace_volumes_df_per_fluid_and_categorized_result_names_async(
            table_name, result_names, group_by_indices, indices_with_values, realizations
        )

        # Create Results DataFrame from the Inplace Volumes DataFrame w/ all required volumes
        # - All necessary inplace volumes are retrieved, filtered by wanted index values and realizations, and accumulated by selected indices and realization.
        # - Create result DataFrame, i.e. calculate wanted properties and calculated volumes per fluid value.
        # - Calculate statistical results data across realizations for each fluid value.
        # - Provide inplace results statistical api-data per fluid value.
        statistical_table_data_per_fluid_value: list[InplaceVolumesStatisticalTableData] = []
        for fluid_value, accumulated_fluid_volumes_df in accumulated_inplace_volumes_df_per_fluid_value.items():
            if "REAL" not in accumulated_fluid_volumes_df.columns:
                raise NoDataError("No realization data found in dataframe", Service.GENERAL)
            if InplaceVolumes.TableIndexColumns.FLUID.value in accumulated_fluid_volumes_df.columns:
                raise InvalidDataError(
                    "The DataFrame should not contain FLUID column when DataFrame is per unique fluid value",
                    Service.GENERAL,
                )

            # Create result df - requested volumes and calculated properties
            accumulated_result_df = create_per_fluid_results_df(
                accumulated_fluid_volumes_df, categorized_result_names, fluid_value
            )

            # Create statistical table data across realization
            selector_column_data_list, result_column_data_list = create_statistical_result_table_data_from_df(
                accumulated_result_df
            )

            statistical_table_data_per_fluid_value.append(
                InplaceVolumesStatisticalTableData(
                    fluid_selection=fluid_value,
                    selector_columns=selector_column_data_list,
                    result_column_statistics=result_column_data_list,
                )
            )

        return InplaceVolumesStatisticalTableDataPerFluidSelection(
            table_data_per_fluid_selection=statistical_table_data_per_fluid_value
        )

    async def _create_accumulated_inplace_volumes_df_per_fluid_and_categorized_result_names_async(
        self,
        table_name: str,
        result_names: set[str],
        group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues],
        realizations: list[int] | None,
    ) -> tuple[dict[str, pl.DataFrame], CategorizedResultNames]:
        """
        Get a dictionary with DataFrame per unique fluid value, and object with categorized result names for the given DataFrame.

        `Accumulation`: Sum the volumes by the grouping indices and realizations.

        `Inplace volumes`: All necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes.

        - This function retrieves all necessary volumes DataFrame from Sumo, filters the DataFrame on the provided indices values and realizations, and
        sum the volumes by the provided group_by_indices and realizations. Thereafter the function creates a dictionary with DataFrame per unique fluid value.

        - It also categorizes the result names into volume names, calculated volume names, and property names.

        Note: If group_by_indices is None or does not include FLUID, the fluids will be summed in the result, and BO and BG
        properties will be excluded from the result names.
        """

        if group_by_indices == []:
            raise InvalidParameterError("Group by indices must be non-empty list or None", Service.GENERAL)
        if realizations == []:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        sum_fluids = group_by_indices is None or InplaceVolumes.TableIndexColumns.FLUID not in group_by_indices

        # Valid result names (exclude properties BO and BG if fluids are to be summed)
        valid_result_names = result_names
        if sum_fluids:
            valid_result_names = {r for r in result_names if r not in (Property.BO.value, Property.BG.value)}

        # Get all necessary volumes: volume columns, and volumes needed to calculate properties and calculated volumes
        all_necessary_volume_names, categorized_result_names = get_required_volume_names_and_categorized_result_names(
            valid_result_names
        )

        # Create volumes df filtered on indices values and realizations, for all necessary volumes
        row_filtered_volumes_df = await self._get_row_filtered_inplace_volumes_df_async(
            table_name, all_necessary_volume_names, realizations, indices_with_values
        )

        if row_filtered_volumes_df is None:
            # If no data is found for the given indices and realizations, return empty dictionary
            empty_dict: dict[str, pl.DataFrame] = {}
            return (empty_dict, categorized_result_names)

        # Ensure valid inplace volumes DataFrame (contains necessary index columns and realization column)
        validate_inplace_volumes_df_selector_columns(row_filtered_volumes_df)

        # Create summed inplace volumes table data grouped by selected index columns and realizations
        # - Resulting DataFrame has selector columns: REAL + index columns in group_by_indices
        summed_volumes_by_indices_and_reals_df = sum_inplace_volumes_by_indices_and_realizations_df(
            row_filtered_volumes_df, group_by_indices
        )

        # Create dictionary with DataFrame per unique fluid value
        accumulated_inplace_volumes_df_per_fluid_value_dict: dict[str, pl.DataFrame] = {}
        if InplaceVolumes.TableIndexColumns.FLUID in summed_volumes_by_indices_and_reals_df.columns:
            accumulated_inplace_volumes_df_per_fluid_value_dict = create_inplace_volumes_df_per_unique_fluid_value(
                summed_volumes_by_indices_and_reals_df
            )
        else:
            # If not grouped by fluid, the fluids are summed and column FLUID is not present in the DataFrame
            unique_fluids = row_filtered_volumes_df[InplaceVolumes.TableIndexColumns.FLUID.value].unique().to_list()
            summed_fluids_string = " + ".join(unique_fluids)
            accumulated_inplace_volumes_df_per_fluid_value_dict[
                summed_fluids_string
            ] = summed_volumes_by_indices_and_reals_df

        return (
            accumulated_inplace_volumes_df_per_fluid_value_dict,
            categorized_result_names,
        )

    async def _get_row_filtered_inplace_volumes_df_async(
        self,
        table_name: str,
        volume_names: set[str],
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues],
    ) -> pl.DataFrame | None:
        """
        This function creates a volumes DataFrame filtered on the provided indices values and realizations.

        The requested volume names is the set of volume columns, and necessary volume names to calculate properties and calculated volumes.
        Calculation of properties and calculated volumes are handled outside this function.

        The DataFrame is create by filtering the raw inplace volumes table on provided indices values and realizations.

        Input:
        - table_name: str - Name of the table in Sumo
        - volume_names: set[str] - All volume names needed from Sumo, including volume names needed for properties and calculated volumes
        - realizations: list[int] - Realizations to include in the volumetric table
        - indices_with_values: list[InplaceVolumesIndexWithValues] - Index values to filter the inplace volumes table, i.e. row filtering
        """
        # Check for empty identifier selections
        has_empty_index_selection = any(not index_with_values.values for index_with_values in indices_with_values)
        if has_empty_index_selection:
            raise InvalidParameterError(
                "Each provided index column must have at least one selected value", Service.GENERAL
            )

        timer = PerfTimer()

        # Get the inplace volumes table as DataFrame
        volumes_table_df: pl.DataFrame = await self._get_inplace_volumes_table_as_polars_df_async(
            table_name=table_name, volume_columns=volume_names
        )

        # Create dataframe filtered on indices and realizations
        row_filtered_volumes_table_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_table_df(
            table_name=table_name,
            inplace_volumes_table_df=volumes_table_df,
            realizations=realizations,
            indices_with_values=indices_with_values,
        )

        timer_create_row_filtered_df = timer.lap_ms()
        print(f"Time creating row filtered DataFrame: {timer_create_row_filtered_df}ms")

        return row_filtered_volumes_table_df

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
    def _create_row_filtered_inplace_volumes_table_df(
        table_name: str,
        inplace_volumes_table_df: pl.DataFrame,
        realizations: list[int] | None,
        indices_with_values: list[InplaceVolumesIndexWithValues],
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
