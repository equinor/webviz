import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { InplaceVolDataEnsembleSet } from "../typesAndEnums";

type InplaceVolTableRow = {
    [key: string]: number | string | number[] | EnsembleIdent;
};
type InplaceResultValues = {
    values: number[];
    realizations: number[];
};
export class InplaceDataAccesser {
    private _table: InplaceVolTableRow[];

    constructor(tableCollections: InplaceVolDataEnsembleSet[]) {
        this._table = createTable(tableCollections);
    }
    public getTable(): InplaceVolTableRow[] {
        return this._table;
    }
    public getResultValuesForGroupAndSubgroup(
        groupBy: string | EnsembleIdent,
        subgroupBy: string | EnsembleIdent,
        ensembleIdent: EnsembleIdent
    ): InplaceResultValues[] {
        return [];
    }
}

function createTable(tableCollections: InplaceVolDataEnsembleSet[]): InplaceVolTableRow[] {
    const table: InplaceVolTableRow[] = [];
    tableCollections.forEach((tableCollection) => {
        if (tableCollection.data) {
            const indexNames = tableCollection.data.index_names;

            tableCollection.data.entries.forEach((entry) => {
                const row: InplaceVolTableRow = {
                    ensembleIdent: tableCollection.ensembleIdent,
                };
                entry.index_values.forEach((value, index) => {
                    row[indexNames[index]] = value;
                });
                row["result_values"] = entry.result_values;

                table.push(row);
            });
        }
    });
    return table;
}
