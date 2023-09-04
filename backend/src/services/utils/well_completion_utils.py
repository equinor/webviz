import itertools
from typing import Dict, Iterator, List, Optional, Tuple

import pandas as pd

from src.services.types.well_completion_types import (
    Completions,
    WellCompletionAttributeType,
    WellCompletionWell,
    WellCompletionDataSet,
    WellCompletionZone,
)


class WellCompletionDataModel:
    def __init__(self, well_completion_data: pd.DataFrame) -> None:
        # NOTE: Which level of verification?
        # - Only columns names?
        # - Verify dtype of columns?
        # - Verify dimension of columns - only 2D df?

        expected_columns = set(["WELL", "DATE", "ZONE", "REAL", "OP/SH", "KH"])
        if expected_columns != set(well_completion_data.columns):
            raise ValueError(f"Expected columns: {expected_columns} - got: {well_completion_data.columns}")

        self._well_completion_df = well_completion_data

        # NOTE: Metadata should be provided by Sumo?
        # _kh_unit = (
        #         kh_metadata.unit
        #         if kh_metadata is not None and kh_metadata.unit is not None
        #         else ""
        #     )
        self._kh_unit = "mDm"  # NOTE: How to find metadata?
        self._kh_decimal_places = 2
        self._datemap = {dte: i for i, dte in enumerate(sorted(self._well_completion_df["DATE"].unique()))}
        self._zones = list(sorted(self._well_completion_df["ZONE"].unique()))

        self._well_completion_df["TIMESTEP"] = self._well_completion_df["DATE"].map(self._datemap)

        # NOTE:
        # - How to handle well attributes? Should be provided by Sumo?
        # - How to handle theme colors?
        self._well_attributes: Dict[
            str, Dict[str, WellCompletionAttributeType]
        ] = {}  # Each well has dict of attributes
        self._theme_colors = ["#6EA35A", "#EDAF4C", "#CA413D"]  # Hard coded

    def _dummy_stratigraphy(self) -> List[WellCompletionZone]:
        """
        Returns a default stratigraphy for TESTING, should be provided by Sumo
        """
        return [
            WellCompletionZone(
                name="TopVolantis_BaseVolantis",
                color="#6EA35A",
                subzones=[
                    WellCompletionZone(name="Valysar", color="#6EA35A"),
                    WellCompletionZone(name="Therys", color="#EDAF4C"),
                    WellCompletionZone(name="Volon", color="#CA413D"),
                ],
            ),
        ]

    def create_well_completion_dataset(self) -> WellCompletionDataSet:
        """Creates well completion dataset for front-end"""

        return WellCompletionDataSet(
            version="1.1.0",
            units={"kh": {"unit": self._kh_unit, "decimalPlaces": self._kh_decimal_places}},
            stratigraphy=self._extract_stratigraphy(self._dummy_stratigraphy(), self._zones),
            timeSteps=[pd.to_datetime(str(dte)).strftime("%Y-%m-%d") for dte in self._datemap.keys()],
            wells=self._extract_wells(),
        )

    def _extract_wells(self) -> List[WellCompletionWell]:
        """Generates the wells part of the dataset to front-end"""
        well_list = []
        no_real = self._well_completion_df["REAL"].nunique()
        for well_name, well_group in self._well_completion_df.groupby("WELL"):
            well_data = self._extract_well(well_group, well_name, no_real)
            well_data.attributes = self._well_attributes[well_name] if well_name in self._well_attributes else {}
            well_list.append(well_data)
        return well_list

    def _extract_well(self, well_group: pd.DataFrame, well_name: str, no_real: int) -> WellCompletionWell:
        """Extract completion events and kh values for a single well"""
        well: WellCompletionWell = WellCompletionWell(name=well_name, attributes={}, completions={})

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
        self, stratigraphy: Optional[List[WellCompletionZone]], zones: List[str]
    ) -> List[WellCompletionZone]:
        """Returns the stratigraphy part of the dataset to front-end"""
        color_iterator = itertools.cycle(self._theme_colors)

        # If no stratigraphy file is found then the stratigraphy is
        # created from the unique zones in the wellcompletiondata input.
        # They will then probably not come in the correct order.
        if stratigraphy is None:
            return [WellCompletionZone(name=zone, color=next(color_iterator)) for zone in zones]

        # If stratigraphy is not None the following is done:
        stratigraphy, remaining_valid_zones = self._filter_valid_nodes(stratigraphy, zones)

        if remaining_valid_zones:
            raise ValueError(
                "The following zones are defined in the well completion data, "
                f"but not in the stratigraphy: {remaining_valid_zones}"
            )

        return self._add_colors_to_stratigraphy(stratigraphy, color_iterator)

    def _add_colors_to_stratigraphy(
        self,
        stratigraphy: List[WellCompletionZone],
        color_iterator: Iterator,
        zone_color_mapping: Optional[Dict[str, str]] = None,
    ) -> List[WellCompletionZone]:
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
        self, stratigraphy: List[WellCompletionZone], valid_zone_names: List[str]
    ) -> Tuple[List[WellCompletionZone], List[str]]:
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
