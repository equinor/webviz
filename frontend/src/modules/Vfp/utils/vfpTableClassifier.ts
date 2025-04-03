import type { VfpInjTable_api, VfpProdTable_api } from "@api";

export function isProdTable(vfpTable: VfpProdTable_api | VfpInjTable_api): vfpTable is VfpProdTable_api {
    return vfpTable.vfpType === "PROD";
}

export function isInjTable(vfpTable: VfpProdTable_api | VfpInjTable_api): vfpTable is VfpInjTable_api {
    return vfpTable.vfpType === "INJ";
}
