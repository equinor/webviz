import { VfpProdTable_api, VfpInjTable_api } from "@api";

export function isProdTable(vfpTable: VfpProdTable_api | VfpInjTable_api): vfpTable is VfpProdTable_api {
    return "isProdTable" in vfpTable
}