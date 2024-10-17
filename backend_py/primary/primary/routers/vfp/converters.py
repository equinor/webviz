from primary.services.sumo_access.vfp_types import VfpProdTable, VfpInjTable, VfpType

from . import schemas


def to_api_table_definitions(
    vfp_table: VfpProdTable | VfpInjTable,
) -> schemas.VfpProdTable | schemas.VfpInjTable:
    """Converts the vfp table definitions from the sumo service to the API format"""
    if isinstance(vfp_table, VfpProdTable):
        return schemas.VfpProdTable(
            tableNumber = vfp_table.table_number,
            datum = vfp_table.datum,
            thpType = vfp_table.thp_type,
            wfrType = vfp_table.wfr_type,
            gfrType = vfp_table.gfr_type,
            alqType = vfp_table.alq_type,
            flowRateType = vfp_table.flow_rate_type,
            unitType = vfp_table.unit_type,
            tabType = vfp_table.tab_type,
            thpValues = vfp_table.thp_values,
            wfrValues = vfp_table.wfr_values,
            gfrValues = vfp_table.gfr_values,
            alqValues = vfp_table.alq_values,
            flowRateValues = vfp_table.flow_rate_values,
            bhpValues = vfp_table.bhp_values,
            flowRateUnit = vfp_table.flow_rate_unit,
            thpUnit = vfp_table.thp_unit,
            wfrUnit = vfp_table.wfr_unit,
            gfrUnit = vfp_table.gfr_unit,
            alqUnit = vfp_table.alq_unit,
            bhpUnit = vfp_table.bhp_unit,
        )
    if isinstance(vfp_table, VfpInjTable):
        return schemas.VfpInjTable(
            tableNumber = vfp_table.table_number,
            datum = vfp_table.datum,
            flowRateType = vfp_table.flow_rate_type,
            unitType = vfp_table.unit_type,
            tabType = vfp_table.tab_type,
            thpValues = vfp_table.thp_values,
            flowRateValues = vfp_table.flow_rate_values,
            bhpValues = vfp_table.bhp_values,
            flowRateUnit = vfp_table.flow_rate_unit,
            thpUnit = vfp_table.thp_unit,
            bhpUnit = vfp_table.bhp_unit,
        )
    raise ValueError(f"VFP type ")


