import itertools
from typing import Dict, Iterator, List, Optional, Set, Tuple

import pandas as pd

from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient
from ._helpers import create_sumo_client_instance

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

    def __init__(self, access_token: str, case_uuid: str, iteration_name: str) -> None:
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) > 1:
            raise ValueError(f"Multiple sumo cases found {case_uuid=}")
        if len(case_collection) < 1:
            raise ValueError(f"No sumo cases found {case_uuid=}")

        self._case: Case = case_collection[0]
        self._iteration_name = iteration_name
        self._tagname = str("wellcompletiondata")  # Should tagname be hard coded?

    def get_well_completions_data(self, realization: Optional[int]) -> Optional[WellCompletionsData]:
        """Get well completions data for case and iteration"""

        # With single realization, filter on realization
        if realization is not None:
            well_completions_tables = self._case.tables.filter(
                tagname=self._tagname, realization=realization, iteration=self._iteration_name
            )
            well_completions_df = well_completions_tables[0].to_pandas if len(well_completions_tables) > 0 else None
            if well_completions_df is None:
                return None

            return WellCompletionDataConverter(well_completions_df).create_data()

        # With multiple realizations, expect one table with aggregated OP/SH and one with aggregate KH data
        well_completions_tables = self._case.tables.filter(
            tagname=self._tagname, aggregation="collection", iteration=self._iteration_name
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
        self._zones = list(sorted(self._well_completions_df["ZONE"].unique()))

        self._well_completions_df["TIMESTEP"] = self._well_completions_df["DATE"].map(self._datemap)

        # NOTE:
        # - How to handle well attributes? Should be provided by Sumo?
        # - How to handle theme colors?
        self._well_attributes: Dict[
            str, Dict[str, WellCompletionsAttributeType]
        ] = {}  # Each well has dict of attributes
        self._theme_colors = ["#6EA35A", "#EDAF4C", "#CA413D"]  # Hard coded

    def _dummy_stratigraphy(self) -> List[WellCompletionsZone]:
        """
        Returns a default stratigraphy for TESTING, should be provided by Sumo
        """
        return [
            WellCompletionsZone(
                name="TopVolantis_BaseVolantis",
                color="#6EA35A",
                subzones=[
                    WellCompletionsZone(name="Valysar", color="#6EA35A"),
                    WellCompletionsZone(name="Therys", color="#EDAF4C"),
                    WellCompletionsZone(name="Volon", color="#CA413D"),
                ],
            ),
        ]

    def create_data(self) -> WellCompletionsData:
        """Creates well completions dataset for front-end"""

        return WellCompletionsData(
            version="1.1.0",
            units=WellCompletionsUnits(
                kh=WellCompletionsUnitInfo(unit=self._kh_unit, decimalPlaces=self._kh_decimal_places)
            ),
            stratigraphy=self._extract_stratigraphy(self._dummy_stratigraphy(), self._zones),
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

    def _extract_stratigraphy(
        self, stratigraphy: Optional[List[WellCompletionsZone]], zones: List[str]
    ) -> List[WellCompletionsZone]:
        """Returns the stratigraphy part of the dataset to front-end"""
        color_iterator = itertools.cycle(self._theme_colors)

        # If no stratigraphy file is found then the stratigraphy is
        # created from the unique zones in the well completions data input.
        # They will then probably not come in the correct order.
        if stratigraphy is None:
            return [WellCompletionsZone(name=zone, color=next(color_iterator)) for zone in zones]

        # If stratigraphy is not None the following is done:
        stratigraphy, remaining_valid_zones = self._filter_valid_nodes(stratigraphy, zones)

        if remaining_valid_zones:
            raise ValueError(
                "The following zones are defined in the well completions data, "
                f"but not in the stratigraphy: {remaining_valid_zones}"
            )

        return self._add_colors_to_stratigraphy(stratigraphy, color_iterator)

    def _add_colors_to_stratigraphy(
        self,
        stratigraphy: List[WellCompletionsZone],
        color_iterator: Iterator,
        zone_color_mapping: Optional[Dict[str, str]] = None,
    ) -> List[WellCompletionsZone]:
        """Add colors to the stratigraphy tree. The function will recursively parse the tree.

        There are tree sources of color:
        1. The color is given in the stratigraphy list, in which case nothing is done to the node
        2. The color is the optional the zone->color map
        3. If none of the above applies, the color will be taken from the theme color iterable for \
        the leaves. For other levels, a dummy color grey is used
        """
        for zone in stratigraphy:
            if zone.color == "":
                if zone_color_mapping is not None and zone.name in zone_color_mapping:
                    zone.color = zone_color_mapping[zone.name]
                elif zone.subzones is None:
                    zone = next(color_iterator)  # theme colors only applied on leaves
                else:
                    zone.color = "#808080"  # grey
            if zone.subzones is not None:
                zone.subzones = self._add_colors_to_stratigraphy(
                    zone.subzones,
                    color_iterator,
                    zone_color_mapping=zone_color_mapping,
                )
        return stratigraphy

    def _filter_valid_nodes(
        self, stratigraphy: List[WellCompletionsZone], valid_zone_names: List[str]
    ) -> Tuple[List[WellCompletionsZone], List[str]]:
        """Returns the stratigraphy tree with only valid nodes.
        A node is considered valid if it self or one of it's subzones are in the
        valid zone names list (passed from the lyr file)

        The function recursively parses the tree to add valid nodes.
        """

        output = []
        remaining_valid_zones = valid_zone_names
        for zone in stratigraphy:
            if zone.subzones is not None:
                zone.subzones, remaining_valid_zones = self._filter_valid_nodes(zone.subzones, remaining_valid_zones)
            if zone.name in remaining_valid_zones:
                output.append(zone)
                remaining_valid_zones = [
                    elm for elm in remaining_valid_zones if elm != zone.name
                ]  # remove zone name from valid zones if it is found in the stratigraphy
            elif zone.subzones is not None:
                output.append(zone)

        return output, remaining_valid_zones
