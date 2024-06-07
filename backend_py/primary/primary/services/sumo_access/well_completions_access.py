from typing import Dict, List, Optional, Set, Tuple

import pandas as pd
from fmu.sumo.explorer.objects import Case

from ._helpers import create_sumo_client, create_sumo_case_async

from .well_completions_types import (
    Completions,
    WellCompletionsAttributeType,
    WellCompletionsWell,
    WellCompletionsData,
    WellCompletionsZone,
    WellCompletionsUnitInfo,
    WellCompletionsUnits,
)


class WellCompletionsAccess:
    """
    Class for accessing and retrieving well completions data
    """

    TAGNAME = "wellcompletiondata"

    def __init__(self, case: Case, iteration_name: str):
        self._case: Case = case
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "WellCompletionsAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return WellCompletionsAccess(case=case, iteration_name=iteration_name)

    def get_well_completions_data(self, realization: Optional[int]) -> Optional[WellCompletionsData]:
        """Get well completions data for case and iteration"""

        # With single realization, filter on realization
        if realization is not None:
            well_completions_tables = self._case.tables.filter(
                tagname=WellCompletionsAccess.TAGNAME, realization=realization, iteration=self._iteration_name
            )
            well_completions_df = well_completions_tables[0].to_pandas if len(well_completions_tables) > 0 else None
            if well_completions_df is None:
                return None

            return WellCompletionDataConverter(well_completions_df).create_data()

        # With multiple realizations, expect one table with aggregated OP/SH and one with aggregate KH data
        well_completions_tables = self._case.tables.filter(
            tagname=WellCompletionsAccess.TAGNAME, aggregation="collection", iteration=self._iteration_name
        )

        # As of now, two tables are expected - one with OP/SH and one with KH
        if len(well_completions_tables) < 2:
            return None

        expected_common_columns = set(["WELL", "DATE", "ZONE", "REAL"])
        first_df = well_completions_tables[0].to_pandas
        second_df = well_completions_tables[1].to_pandas

        # Validate columns and ensure equal column content in both tables
        self._validate_common_dataframe_columns(expected_common_columns, first_df, second_df)

        # Assign "KH" column to the dataframe with missing column
        if "OP/SH" in first_df.columns and "KH" in second_df.columns:
            first_df["KH"] = second_df["KH"]
            return WellCompletionDataConverter(first_df).create_data()
        if "OP/SH" in second_df.columns and "KH" in first_df.columns:
            second_df["KH"] = first_df["KH"]
            return WellCompletionDataConverter(second_df).create_data()

        raise ValueError('Expected columns "OP/SH" and "KH" not found in tables')

    def _validate_common_dataframe_columns(
        self, common_column_names: Set[str], first_df: pd.DataFrame, second_df: pd.DataFrame
    ) -> None:
        """
        Validates that the two dataframes contains same common columns and that the columns have the same content,
        raises value error if not matching.
        """
        # Ensure expected columns are present
        if not common_column_names.issubset(first_df.columns):
            raise ValueError(f"Expected columns of first table: {common_column_names} - got: {first_df.columns}")
        if not common_column_names.issubset(second_df.columns):
            raise ValueError(f"Expected columns of second table: {common_column_names} - got: {second_df.columns}")

        # Verify equal columns in both tables
        for column_name in common_column_names:
            if not (first_df[column_name] == second_df[column_name]).all():
                raise ValueError(f'Expected equal column content, "{column_name}", in first and second dataframe')


class WellCompletionDataConverter:
    """
    Class for converter into WellCompletionData type from a pandas dataframe with well completions data

    Accessor retrieves well completions data from Sumo as table data. This converter class handles
    the pandas dataframe and provides a data structure for API to consume.
    """

    def __init__(self, well_completions_df: pd.DataFrame) -> None:
        # NOTE: Which level of verification?
        # - Only columns names?
        # - Verify dtype of columns?
        # - Verify dimension of columns - only 2D df?

        # Based on realization filtering in Accessor, the "REAL" column is optional - not expected
        expected_columns = set(["WELL", "DATE", "ZONE", "OP/SH", "KH"])

        if not expected_columns.issubset(well_completions_df.columns):
            raise ValueError(f"Expected columns: {expected_columns} - got: {well_completions_df.columns}")

        self._well_completions_df = well_completions_df

        # NOTE: Metadata should be provided by Sumo?
        # _kh_unit = (
        #         kh_metadata.unit
        #         if kh_metadata is not None and kh_metadata.unit is not None
        #         else ""
        #     )
        self._kh_unit = "mDm"  # NOTE: How to find metadata?
        self._kh_decimal_places = 2
        self._datemap = {dte: i for i, dte in enumerate(sorted(self._well_completions_df["DATE"].unique()))}
        self._zone_name_list = list(sorted(self._well_completions_df["ZONE"].unique()))

        # NOTE: The zone tree structure should be provided by server in the future
        # to obtain parent/child relationship between zones
        self._zones_tree = None

        self._well_completions_df["TIMESTEP"] = self._well_completions_df["DATE"].map(self._datemap)

        # NOTE:
        # - How to handle well attributes? Should be provided by Sumo?
        self._well_attributes: Dict[
            str, Dict[str, WellCompletionsAttributeType]
        ] = {}  # Each well has dict of attributes

    def create_data(self) -> WellCompletionsData:
        """Creates well completions dataset for front-end"""

        return WellCompletionsData(
            version="1.1.0",
            units=WellCompletionsUnits(
                kh=WellCompletionsUnitInfo(unit=self._kh_unit, decimalPlaces=self._kh_decimal_places)
            ),
            zones=self._extract_well_completions_zones(zones=self._zones_tree, zone_name_list=self._zone_name_list),
            timeSteps=[pd.to_datetime(str(dte)).strftime("%Y-%m-%d") for dte in self._datemap.keys()],
            wells=self._extract_wells(),
        )

    def _extract_wells(self) -> List[WellCompletionsWell]:
        """Generates the wells part of the dataset to front-end"""
        # Optional "REAL" column, i.e. no column implies only one realization
        no_real = self._well_completions_df["REAL"].nunique() if "REAL" in self._well_completions_df.columns else 1

        well_list = []
        for well_name, well_group in self._well_completions_df.groupby("WELL"):
            well_data = self._extract_well(well_group, well_name, no_real)
            well_data.attributes = self._well_attributes[well_name] if well_name in self._well_attributes else {}
            well_list.append(well_data)
        return well_list

    def _extract_well(self, well_group: pd.DataFrame, well_name: str, no_real: int) -> WellCompletionsWell:
        """Extract completions events and kh values for a single well"""
        well: WellCompletionsWell = WellCompletionsWell(name=well_name, attributes={}, completions={})

        completions: Dict[str, Completions] = {}
        for (zone, timestep), group_df in well_group.groupby(["ZONE", "TIMESTEP"]):
            data = group_df["OP/SH"].value_counts()
            if zone not in completions:
                completions[zone] = Completions(t=[], open=[], shut=[], kh_mean=[], kh_min=[], kh_max=[])

            zone_completions = completions[zone]
            zone_completions.t.append(int(timestep))
            zone_completions.open.append(float(data["OPEN"] / no_real if "OPEN" in data else 0))
            zone_completions.shut.append(float(data["SHUT"] / no_real if "SHUT" in data else 0))
            zone_completions.kh_mean.append(round(float(group_df["KH"].mean()), 2))
            zone_completions.kh_min.append(round(float(group_df["KH"].min()), 2))
            zone_completions.kh_max.append(round(float(group_df["KH"].max()), 2))

        well.completions = completions
        return well

    def _extract_well_completions_zones(
        self, zones: Optional[List[WellCompletionsZone]], zone_name_list: List[str]
    ) -> List[WellCompletionsZone]:
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
            raise ValueError(
                "The following zones are defined in the well completions data, "
                f"but not in the list of zone names: {remaining_valid_zones}"
            )

        return zones

    def _filter_valid_nodes(
        self, zones: List[WellCompletionsZone], valid_zone_names: List[str]
    ) -> Tuple[List[WellCompletionsZone], List[str]]:
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
