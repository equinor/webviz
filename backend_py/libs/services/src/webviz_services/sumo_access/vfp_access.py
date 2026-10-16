import logging
from typing import List

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_services.service_exceptions import InvalidParameterError, NoDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client
from .vfp_types import (
    ALQ,
    GFR,
    WFR,
    FlowRateType,
    TabType,
    UnitType,
    VfpProdTable,
    VfpInjTable,
    VfpTableInfo,
    VfpType,
    VfpParam,
    VFP_UNITS,
    THP,
)

LOGGER = logging.getLogger(__name__)


def _flatten_bhp_values(tab_arr: np.ndarray, axis_arrs: List[np.ndarray]) -> List[float]:
    """Flattens the table given axis order, in order to reduce redundancy in the data to be sent to frontend.

    A VFP table has one row per axis-value combination. The output is ordered so that the last
    axis moves fastest and the first axis moves slowest.

    ``axis_arrs`` is the ordered list of per-row axis columns, from slowest to fastest moving axis.

    The resulting flat order is decoded on the frontend by VfpApiTableDataAccessor.getVfpProdBhpValues /
    getVfpInjBhpValues in frontend/src/modules/Vfp/utils/vfpApiTableDataAccessor.ts.
    """
    # np.lexsort treats its last key as the most significant (slowest-moving), so reverse the axis order.
    sort_indices = np.lexsort(list(reversed(axis_arrs)))
    return tab_arr[sort_indices].tolist()


class VfpAccess:
    """
    Class for accessing and retrieving Vfp tables
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "VfpAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_all_vfp_tables_for_realization_async(self, realization: int) -> List[VfpTableInfo]:
        """Returns info (type and number) for all VFP tables for a realization.

        The lift_curves standard result bundles all VFP tables into a single object. VFPPROD and VFPINJ
        tables use separate table-number namespaces, so a table is identified by (VFP_TYPE, TABLE_NUMBER).
        """
        pa_table = await self._get_vfp_standard_result_table_as_pyarrow_async(realization)
        for column in ("VFP_TYPE", "TABLE_NUMBER"):
            if column not in pa_table.schema.names:
                raise NoDataError(
                    f"Missing required VFP table column: {column} for realization: {realization}", Service.SUMO
                )

        unique_rows = (
            pa_table.select(["VFP_TYPE", "TABLE_NUMBER"]).group_by(["VFP_TYPE", "TABLE_NUMBER"]).aggregate([])
        ).to_pylist()

        table_infos = [
            VfpTableInfo(vfp_type=VfpType(row["VFP_TYPE"]), table_number=int(row["TABLE_NUMBER"]))
            for row in unique_rows
        ]
        return sorted(table_infos, key=lambda info: (info.vfp_type.value, info.table_number))

    async def _get_vfp_standard_result_table_as_pyarrow_async(self, realization: int) -> pa.Table:
        """Returns the bundled lift_curves standard result table (all VFP tables) for a realization."""
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.lift_curves)
        pa_table = await table_loader.get_single_realization_async(realization)

        return pa_table

    async def get_vfp_table_from_type_and_number_async(
        self, vfp_type: VfpType, table_number: int, realization: int
    ) -> VfpProdTable | VfpInjTable:
        """Returns the VFP table for a specific type, table number and realization.

        If the VFP table type is VFPINJ then a VfpInjTable object is returned.
        If the VFP table type is VFPPROD then a VfpProdTable object is returned
        """

        bundled_pa_table = await self._get_vfp_standard_result_table_as_pyarrow_async(realization)

        # Validate that the required columns (and associated column metadata) are present.
        self._validate_vfp_pa_table_columns(bundled_pa_table)

        # The bundled standard result contains all VFP tables for the realization. Filter down to the rows
        # belonging to the requested (type, number) so the metadata and axis values describe a single table.
        pa_table = bundled_pa_table.filter(
            pc.and_(
                pc.equal(bundled_pa_table.column("VFP_TYPE"), pa.scalar(vfp_type.value)),
                pc.equal(bundled_pa_table.column("TABLE_NUMBER"), pa.scalar(table_number)),
            )
        )
        if pa_table.num_rows == 0:
            raise NoDataError(
                f"No {vfp_type.value} table found with table number {table_number} for realization: {realization}",
                Service.SUMO,
            )

        # Extract the per-table metadata. These columns are constant within a single VFP table (single
        # TABLE_NUMBER), so reading the first row is sufficient.
        meta = (
            pa_table.slice(0, 1)
            .select(["VFP_TYPE", "UNIT_TYPE", "RATE_TYPE", "TABLE_NUMBER", "DATUM", "TAB_TYPE", "PRESSURE_TYPE"])
            .to_pylist()[0]
        )
        vfp_type = VfpType(meta["VFP_TYPE"])
        unit_type = UnitType(meta["UNIT_TYPE"])
        flow_rate_type = FlowRateType(meta["RATE_TYPE"])
        thp_type = THP.THP

        # The pressure axis of a VFP table is assumed to always be the tubing head pressure (THP).
        # The frontend relies on this assumption, so assert it here.
        if meta["PRESSURE_TYPE"] != THP.THP.value:
            raise NoDataError(
                f"Unexpected VFP PRESSURE_TYPE '{meta['PRESSURE_TYPE']}', expected '{THP.THP.value}'", Service.SUMO
            )

        pressure_arr = pa_table.column("PRESSURE").to_numpy()
        rate_arr = pa_table.column("RATE").to_numpy()
        tab_arr = pa_table.column("TAB").to_numpy()

        if vfp_type == VfpType.VFPINJ:
            return VfpInjTable(
                table_number=int(meta["TABLE_NUMBER"]),
                datum=float(meta["DATUM"]),
                flow_rate_type=flow_rate_type,
                unit_type=unit_type,
                tab_type=TabType(meta["TAB_TYPE"]),
                thp_values=np.unique(pressure_arr).tolist(),
                flow_rate_values=np.unique(rate_arr).tolist(),
                bhp_values=_flatten_bhp_values(tab_arr, [pressure_arr, rate_arr]),
                flow_rate_unit=VFP_UNITS[unit_type][VfpParam.FLOWRATE][flow_rate_type],
                thp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
                bhp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
            )

        if vfp_type == VfpType.VFPPROD:
            # Validate required columns specific to VFPPROD
            self._validate_vfp_prod_table_specific_columns(pa_table)

            # Extracting additional metadata valid only for VFPPROD
            prod_meta = pa_table.slice(0, 1).select(["WFR_TYPE", "GFR_TYPE", "ALQ_TYPE"]).to_pylist()[0]
            wfr_type = WFR(prod_meta["WFR_TYPE"])
            gfr_type = GFR(prod_meta["GFR_TYPE"])
            alq_type = ALQ(prod_meta["ALQ_TYPE"]) if prod_meta["ALQ_TYPE"] not in ("''", "") else ALQ.UNDEFINED

            wfr_arr = pa_table.column("WFR").to_numpy()
            gfr_arr = pa_table.column("GFR").to_numpy()
            alq_arr = pa_table.column("ALQ").to_numpy()

            return VfpProdTable(
                table_number=int(meta["TABLE_NUMBER"]),
                datum=float(meta["DATUM"]),
                thp_type=thp_type,
                wfr_type=wfr_type,
                gfr_type=gfr_type,
                alq_type=alq_type,
                flow_rate_type=flow_rate_type,
                unit_type=unit_type,
                tab_type=TabType(meta["TAB_TYPE"]),
                thp_values=np.unique(pressure_arr).tolist(),
                wfr_values=np.unique(wfr_arr).tolist(),
                gfr_values=np.unique(gfr_arr).tolist(),
                alq_values=np.unique(alq_arr).tolist(),
                flow_rate_values=np.unique(rate_arr).tolist(),
                # bhp_values order: THP, WFR, GFR, ALQ, Flow rates (flow fastest, THP slowest).
                bhp_values=_flatten_bhp_values(tab_arr, [pressure_arr, wfr_arr, gfr_arr, alq_arr, rate_arr]),
                flow_rate_unit=VFP_UNITS[unit_type][VfpParam.FLOWRATE][flow_rate_type],
                thp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
                wfr_unit=VFP_UNITS[unit_type][VfpParam.WFR][wfr_type],
                gfr_unit=VFP_UNITS[unit_type][VfpParam.GFR][gfr_type],
                alq_unit=VFP_UNITS[unit_type][VfpParam.ALQ][alq_type],
                bhp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
            )

        raise InvalidParameterError(f"VfpType {vfp_type} not handled.", Service.GENERAL)

    def _validate_vfp_pa_table_columns(self, pa_table: pa.Table) -> None:
        """Validates that the required columns are present in the pyarrow table."""
        required_columns = [
            "VFP_TYPE",
            "UNIT_TYPE",
            "PRESSURE_TYPE",
            "RATE_TYPE",
            "TABLE_NUMBER",
            "DATUM",
            "TAB_TYPE",
            "PRESSURE",
            "RATE",
            "TAB",
        ]

        missing_columns = [column for column in required_columns if column not in pa_table.schema.names]

        if missing_columns:
            raise NoDataError(f"Missing required VFP table columns: {', '.join(missing_columns)}", Service.SUMO)

    def _validate_vfp_prod_table_specific_columns(self, pa_table: pa.Table) -> None:
        """Validates that the required columns for VfpProdTable are present in the pyarrow table."""
        required_prod_columns = [
            "WFR_TYPE",
            "GFR_TYPE",
            "ALQ_TYPE",
            "WFR",
            "GFR",
            "ALQ",
        ]

        missing_columns = [column for column in required_prod_columns if column not in pa_table.schema.names]

        if missing_columns:
            raise NoDataError(f"Missing required VFP Prod table columns: {', '.join(missing_columns)}", Service.SUMO)
