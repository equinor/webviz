import datetime
import pyarrow as pa
import pyarrow.compute as pc
import polars as pl


from primary.services.service_exceptions import InvalidDataError, InvalidParameterError, Service
from primary.services.sumo_access.well_completions_access import WellCompletionsAccess

from primary.services.sumo_access.well_completions_types import (
    Completions,
    WellCompletionsAttributeType,
    WellCompletionsWell,
    WellCompletionsData,
    WellCompletionsZone,
    WellCompletionsUnitInfo,
    WellCompletionsUnits,
)


class WellCompletionsAssembler:
    """
    Class for assembling WellCompletionData for front-end consumption.

    Accessor retrieves well completions data from Sumo as table data. This assembler class handles
    the table and assembles well completion data, providing a data structure for API to consume.
    """

    def __init__(self, well_completions_access: WellCompletionsAccess) -> None:
        self._well_completions_access = well_completions_access

        self._well_completions_df: pl.DataFrame | None = None
        self._kh_unit = None
        self._kh_decimal_places = None
        self._sorted_unique_dates: list[datetime.datetime] = None
        self._zone_name_list = None
        self._zones_tree = None
        self._well_attributes = None

    async def fetch_and_initialize_well_completions_single_realization_table_data_async(self, realization: int) -> None:
        if self._well_completions_df is not None:
            raise InvalidDataError("Well completions data already fetched and initialized!")

        well_completions_table = (
            await self._well_completions_access.get_well_completions_single_realization_table_async(
                realization=realization
            )
        )

        self._well_completions_df = pl.DataFrame(well_completions_table)
        self._initialize_well_completions_data_from_df()

    async def fetch_and_initialize_well_completions_table_data_async(self, realizations: list[int] | None) -> None:
        if self._well_completions_df is not None:
            raise InvalidDataError("Well completions data already fetched and initialized!")

        if realizations is not None and len(realizations) == 0:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        well_completions_table = await self._well_completions_access.get_well_completions_table_async(
            realizations=realizations
        )

        # Filter rows based on the "REAL" column
        if realizations is not None:
            real_column = well_completions_table["REAL"]
            realization_mask = pc.is_in(real_column, value_set=pa.array(realizations))
            well_completions_table = well_completions_table.filter(realization_mask)

        self._well_completions_df = pl.DataFrame(well_completions_table)
        self._initialize_well_completions_data_from_df()

    def _initialize_well_completions_data_from_df(self) -> None:
        if self._well_completions_df is None:
            raise InvalidDataError("Well completions data is not loaded")

        # NOTE: Which level of verification?
        # - Only columns names?
        # - Verify dtype of columns?
        # - Verify dimension of columns - only 2D df?

        # Based on realization filtering in Accessor, the "REAL" column is optional - not expected
        expected_columns = set(["WELL", "DATE", "ZONE", "OP/SH", "KH"])

        if not expected_columns.issubset(self._well_completions_df.columns):
            raise InvalidDataError(f"Expected columns: {expected_columns} - got: {self._well_completions_df.columns}")

        # NOTE: Metadata should be provided by Sumo?
        # _kh_unit = (
        #         kh_metadata.unit
        #         if kh_metadata is not None and kh_metadata.unit is not None
        #         else ""
        #     )
        self._kh_unit = "mDm"  # NOTE: How to find metadata?
        self._kh_decimal_places = 2

        self._zone_name_list = list(self._well_completions_df["ZONE"].unique())
        # NOTE: The zone tree structure should be provided by server in the future
        # to obtain parent/child relationship between zones
        self._zones_tree = None

        # Create list of unique dates and date index column
        self._sorted_unique_dates: list[datetime.datetime] = sorted(self._well_completions_df["DATE"].unique())
        date_to_index_map: dict[datetime.datetime, int] = {
            date: idx for idx, date in enumerate(self._sorted_unique_dates)
        }

        # Create date index column, for faster access to date index
        date_index_column_expression = (
            pl.col("DATE").map_elements(date_to_index_map.get).cast(pl.UInt32).alias("DATE_INDEX")
        )
        self._well_completions_df = self._well_completions_df.with_columns(date_index_column_expression)

        # NOTE:
        # - How to handle well attributes? Should be provided by Sumo?
        self._well_attributes: dict[str, dict[str, WellCompletionsAttributeType]] = (
            {}
        )  # Each well has dict of attributes

    def create_well_completions_data(self) -> WellCompletionsData:
        """Creates well completions dataset for front-end"""

        return WellCompletionsData(
            version="1.1.0",
            units=WellCompletionsUnits(
                kh=WellCompletionsUnitInfo(unit=self._kh_unit, decimalPlaces=self._kh_decimal_places)
            ),
            zones=self._extract_well_completions_zones(zones=self._zones_tree, zone_name_list=self._zone_name_list),
            sorted_completion_dates=self._create_sorted_unique_dates_string_list(),
            wells=self._extract_wells(),
        )

    def _create_sorted_unique_dates_string_list(self) -> list[str]:
        """Returns a list of sorted completion dates as string"""
        if self._sorted_unique_dates is None:
            return []
        sorted_unique_date_strings = [elm.strftime("%Y-%m-%d") for elm in self._sorted_unique_dates]

        return sorted_unique_date_strings

    def _extract_wells(self) -> list[WellCompletionsWell]:
        """Generates the wells part of the dataset to front-end"""
        # Optional "REAL" column, i.e. no column implies only one realization
        num_reals = 1
        if "REAL" in self._well_completions_df.columns:
            num_reals = self._well_completions_df["REAL"].n_unique()

        well_list = []
        for group_by_keys, well_group in self._well_completions_df.group_by("WELL"):
            if len(group_by_keys) != 1:
                raise InvalidDataError(f"Expect only one group key when grouping by well: {group_by_keys}")
            well_name = group_by_keys[0]

            well_data = self._extract_well(well_group, well_name, num_reals)
            well_data.attributes = self._well_attributes[well_name] if well_name in self._well_attributes else {}
            well_list.append(well_data)
        return well_list

    def _extract_well(
        self, single_well_completion_df: pl.DataFrame, well_name: str, num_reals: int
    ) -> WellCompletionsWell:
        """
        Extract completions events and kh values for a single well

        The well group df is well completions data for a single well, i.e. original df grouped by "WELL".
        """
        well: WellCompletionsWell = WellCompletionsWell(name=well_name, attributes={}, completions={})

        completions: dict[str, Completions] = {}
        for (zone, date_index), group_df in single_well_completion_df.group_by(["ZONE", "DATE_INDEX"]):
            if zone not in completions:
                completions[zone] = Completions(
                    sorted_completion_date_indices=[], open=[], shut=[], kh_mean=[], kh_min=[], kh_max=[]
                )

            # Get number of occurrences of "OPEN" and "SHUT" in "OP/SH" column
            num_open = group_df.filter(pl.col("OP/SH") == "OPEN").height
            num_shut = group_df.filter(pl.col("OP/SH") == "SHUT").height

            zone_completions = completions[zone]
            zone_completions.sorted_completion_date_indices.append(int(date_index))
            zone_completions.open.append(float(num_open / num_reals if num_reals > 0 else 0))
            zone_completions.shut.append(float(num_shut / num_reals if num_reals > 0 else 0))
            zone_completions.kh_mean.append(round(float(group_df["KH"].mean()), 2))
            zone_completions.kh_min.append(round(float(group_df["KH"].min()), 2))
            zone_completions.kh_max.append(round(float(group_df["KH"].max()), 2))

        well.completions = completions
        return well

    def _extract_well_completions_zones(
        self, zones: list[WellCompletionsZone] | None, zone_name_list: list[str]
    ) -> list[WellCompletionsZone]:
        """Returns the well completions zone objects of the dataset to front-end

        If optional zones definition is provided, it is filtered to only include zones from zone_name_list.
        If no zones definition is provided, a flat zones definition made from zone_name_list is returned.
        """

        # If no well completions zones is found then the well completions zone are
        # created from the unique zones in the well completions data input.
        # They will then probably not come in the correct, and no sone/subzone relationship will be defined.
        if zones is None:
            return [WellCompletionsZone(name=zone) for zone in zone_name_list]

        # If the input zones are not None then filter the zones to only include
        zones, remaining_valid_zones = self._filter_valid_nodes(zones, zone_name_list)

        if remaining_valid_zones:
            raise InvalidDataError(
                "The following zones are defined in the well completions data, "
                f"but not in the list of zone names: {remaining_valid_zones}"
            )

        return zones

    def _filter_valid_nodes(
        self, zones: list[WellCompletionsZone], valid_zone_names: list[str]
    ) -> tuple[list[WellCompletionsZone], list[str]]:
        """Returns the zones tree with only valid nodes.
        A node is considered valid if it self or one of it's subzones are in the
        valid zone names list (passed from the lyr file)

        The function recursively parses the tree to add valid nodes.
        """

        output = []
        remaining_valid_zones = valid_zone_names
        for zone in zones:
            if zone.subzones is not None:
                zone.subzones, remaining_valid_zones = self._filter_valid_nodes(zone.subzones, remaining_valid_zones)
            if zone.name in remaining_valid_zones:
                output.append(zone)
                remaining_valid_zones = [
                    elm for elm in remaining_valid_zones if elm != zone.name
                ]  # remove zone name from valid zones if it is found in the zones tree
            elif zone.subzones is not None:
                output.append(zone)

        return output, remaining_valid_zones
