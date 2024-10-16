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

    _well_completions_df: pl.DataFrame | None
    _sorted_unique_dates: list[datetime.datetime] | None
    _zone_name_list: list[str] | None
    _zones_tree: list[WellCompletionsZone] | None
    _well_attributes: dict[str, dict[str, WellCompletionsAttributeType]] | None
    _kh_unit: str
    _kh_decimal_places: int

    def __init__(self, well_completions_access: WellCompletionsAccess) -> None:
        self._well_completions_access = well_completions_access

        self._well_completions_df = None
        self._sorted_unique_dates = None
        self._zone_name_list = None
        self._well_attributes = None

        # NOTE: The zone tree structure should be provided by server in the future
        # to obtain parent/child relationship between zones
        self._zones_tree = None

        # Should be provided as metadata from Sumo in future
        self._kh_unit = "mDm"
        self._kh_decimal_places = 2

        # Should be provided by Sumo in future
        # - Each well name has dict of attributes
        self._well_attributes: dict[str, dict[str, WellCompletionsAttributeType]] = {}

    async def fetch_and_initialize_well_completions_single_realization_table_data_async(self, realization: int) -> None:
        if self._well_completions_df is not None:
            raise InvalidDataError("Well completions data already fetched and initialized!", Service.GENERAL)

        well_completions_table = (
            await self._well_completions_access.get_well_completions_single_realization_table_async(
                realization=realization
            )
        )

        self._well_completions_df = pl.DataFrame(well_completions_table)
        self._initialize_well_completions_data_from_df()

    async def fetch_and_initialize_well_completions_table_data_async(self, realizations: list[int] | None) -> None:
        if self._well_completions_df is not None:
            raise InvalidDataError("Well completions data already fetched and initialized!", Service.GENERAL)

        if realizations is not None and len(realizations) == 0:
            raise InvalidParameterError("Realizations must be non-empty list or None", Service.GENERAL)

        well_completions_table = await self._well_completions_access.get_well_completions_table_async()

        # Filter rows based on the "REAL" column
        if realizations is not None:
            real_column = well_completions_table["REAL"]
            realization_mask = pc.is_in(real_column, value_set=pa.array(realizations))
            well_completions_table = well_completions_table.filter(realization_mask)

        self._well_completions_df = pl.DataFrame(well_completions_table)
        if self._well_completions_df.height == 0:
                raise InvalidDataError(
                    f"No well completions data found for realizations: {realizations}", Service.GENERAL
                )

        self._initialize_well_completions_data_from_df()

    def _initialize_well_completions_data_from_df(self) -> None:
        if self._well_completions_df is None:
            raise InvalidDataError("Well completions data is not loaded", Service.GENERAL)

        # Based on realization filtering in Accessor, the "REAL" column is optional - not expected
        expected_columns = set(["WELL", "DATE", "ZONE", "OP/SH", "KH"])

        if not expected_columns.issubset(self._well_completions_df.columns):
            raise InvalidDataError(
                f"Expected columns: {expected_columns} - got: {self._well_completions_df.columns}", Service.GENERAL
            )

        # Create list of unique zones, maintaining order
        # - This awaits issue https://github.com/equinor/fmu-dataio/issues/337
        #   in equinor/fmu-dataio to be resolved, providing order/priority of zones/stratigraphy
        self._zone_name_list = list(self._well_completions_df["ZONE"].unique(maintain_order=True))

        # Create list of unique dates and date index column
        self._sorted_unique_dates: list[datetime.datetime] = sorted(self._well_completions_df["DATE"].unique())
        date_to_index_map: dict[datetime.datetime, int] = {
            date: idx for idx, date in enumerate(self._sorted_unique_dates)
        }

        # Create date index column, for faster access to date index
        date_index_column_expression = pl.col("DATE").map_elements(date_to_index_map.get).alias("DATE_INDEX")
        self._well_completions_df = self._well_completions_df.with_columns(date_index_column_expression)

    def create_well_completions_data(self) -> WellCompletionsData:
        """Creates well completions dataset for front-end"""
        if self._well_completions_df is None:
            raise InvalidDataError("Well completions data is not initialized", Service.GENERAL)
        if self._zone_name_list is None:
            raise InvalidDataError("Zone name list is not initialized", Service.GENERAL)

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
        if self._well_completions_df is None:
            raise InvalidDataError("Well completions data is not initialized", Service.GENERAL)
        if self._well_attributes is None:
            raise InvalidDataError("Well attributes are not initialized", Service.GENERAL)

        # Optional "REAL" column, i.e. no column implies only one realization
        num_reals = 1
        if "REAL" in self._well_completions_df.columns:
            num_reals = self._well_completions_df["REAL"].n_unique()

        well_list = []
        for group_by_keys, well_group in self._well_completions_df.group_by("WELL"):
            if len(group_by_keys) != 1:
                raise InvalidDataError(
                    f"Expect only one group key when grouping by well: {group_by_keys}", Service.GENERAL
                )
            well_name: str = str(group_by_keys[0])

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
        for (zone_key, date_index_key), group_df in single_well_completion_df.group_by(["ZONE", "DATE_INDEX"]):
            zone = str(zone_key)

            date_index = None
            if isinstance(date_index_key, int):
                date_index = date_index_key
            if date_index is None:
                raise InvalidDataError(
                    f"Expected date index to be of type int, got: {type(date_index_key)}", Service.GENERAL
                )

            if zone not in completions:
                completions[zone] = Completions(
                    sorted_completion_date_indices=[], open=[], shut=[], kh_mean=[], kh_min=[], kh_max=[]
                )

            # Get number of occurrences of "OPEN" and "SHUT" in "OP/SH" column
            num_open = group_df.filter(pl.col("OP/SH") == "OPEN").height
            num_shut = group_df.filter(pl.col("OP/SH") == "SHUT").height

            kh_series: pl.Series = group_df.get_column("KH")

            def _safe_float(value: float | None) -> float:
                return float(value) if value is not None else 0.0

            zone_completions = completions[zone]
            zone_completions.sorted_completion_date_indices.append(date_index)
            zone_completions.open.append(float(num_open / num_reals if num_reals > 0 else 0))
            zone_completions.shut.append(float(num_shut / num_reals if num_reals > 0 else 0))

            # Disable mypy check for mean, min, max - as linting is not correct
            zone_completions.kh_mean.append(round(_safe_float(kh_series.mean()), 2))  # type: ignore
            zone_completions.kh_min.append(round(_safe_float(kh_series.min()), 2))  # type: ignore
            zone_completions.kh_max.append(round(_safe_float(kh_series.max()), 2))  # type: ignore

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
                f"but not in the list of zone names: {remaining_valid_zones}",
                Service.GENERAL,
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
