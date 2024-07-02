import { FluidZone_api, InplaceVolumetricsTableDefinition_api } from "@api";

import { FluidZoneTypeEnum, InplaceVolumetricsInfoWithEnsembleIdent } from "./types";

export class InplaceVolumesTablesInfoAccessor {
    private _tableInfos: InplaceVolumetricsInfoWithEnsembleIdent[];

    constructor(tableInfos: InplaceVolumetricsInfoWithEnsembleIdent[]) {
        this._tableInfos = tableInfos;
    }

    public getTableNames(): string[] {
        const tableNames = new Set<string>();

        for (const tableInfo of this._tableInfos) {
            tableNames.add(tableInfo.table_name);
        }
        return Array.from(tableNames);
    }
    public getFluidZones(): FluidZone_api[] {
        return Array.from(
            new Set(this._tableInfos.map((tableInfo) => tableInfo.fluid_zones).flat())
        ) as FluidZone_api[];
    }

    public getResponseNames(): string[] {
        return Array.from(new Set(this._tableInfos.map((tableInfo) => tableInfo.result_names).flat()));
    }

    public getPropertyNames(): string[] {
        // Todo handle NET scenarios. Have to check if bulk and net values are different
        const responseNames = this.getResponseNames();
        const propertyNames: string[] = [];

        if (responseNames.includes("BULK") && responseNames.includes("NET")) {
            // todo Should only be added if bulk and net values are different
            propertyNames.push("NTG");
        }

        if (responseNames.includes("BULK") && responseNames.includes("PORV")) {
            propertyNames.push("PORO");
        }

        if (responseNames.includes("NET") && responseNames.includes("PORV")) {
            // todo Should only be added if bulk and net values are different
            propertyNames.push("PORO_NET");
        }
        if (responseNames.includes("PORV") && responseNames.includes("HCPV")) {
            propertyNames.push("SW");
        }
        //Todo
        // if (responseNames.includes("FACIES") && responseNames.includes("BULK")) {
        //     propertyNames.push("FACIES_FRACTION");
        // }
        if (responseNames.includes("HCPV") && responseNames.includes("STOIIP")) {
            propertyNames.push("BO");
        }
        if (responseNames.includes("HCPV") && responseNames.includes("GIIP")) {
            propertyNames.push("BG");
        }
        return propertyNames;
    }

    public getIndexes(): { index_name: string; values: (string | number)[] }[] {
        const indexes = new Map<string, Set<string | number>>();

        // Loop through each table, append new values if not already present
        for (const tableInfo of this._tableInfos) {
            for (const index of tableInfo.indexes) {
                if (indexes.has(index.index_name)) {
                    const existingSet = indexes.get(index.index_name);
                    if (existingSet) {
                        index.values.forEach((value) => existingSet.add(value));
                    }
                } else {
                    indexes.set(index.index_name, new Set(index.values));
                }
            }
        }
        return Array.from(indexes.entries()).map(([index_name, values]) => ({
            index_name,
            values: Array.from(values),
        }));
    }
}
export function responseNamesToStandardResponseNames(responseNames: string[], fluidZones: FluidZone_api[]): string[] {
    const realResponseNames = new Set<string>();
    for (const responseName of responseNames) {
        if (responseName === "STOIIP_TOTAL") {
            realResponseNames.add("STOIIP_OIL");
            realResponseNames.add("ASSOCIATEDOIL_GAS");
        } else if (responseName === "GIIP_TOTAL") {
            realResponseNames.add("GIIP_GAS");
            realResponseNames.add("ASSOCIATEDGAS_OIL");
        } else
            for (const fluidZone of fluidZones) {
                realResponseNames.add(`${responseName}_${fluidZone.toUpperCase()}`);
            }
    }
    return Array.from(realResponseNames);
}
