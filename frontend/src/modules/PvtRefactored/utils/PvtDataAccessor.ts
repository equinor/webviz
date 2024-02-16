import { Phase, PhaseType, PvtTableCollection } from "../typesAndEnums";

export class PvtDataAccessor {
    private _tableCollections: PvtTableCollection[];

    constructor(tableCollections: PvtTableCollection[]) {
        this._tableCollections = tableCollections;
    }

    getUniquePvtNums(): number[] {
        return Array.from(new Set(this._tableCollections.flatMap((el) => el.tables.map((el) => el.pvtnum))));
    }

    getUniquePhases(): Phase[] {
        return this._tableCollections.reduce((acc, el) => {
            el.tables.forEach((table) => {
                if (!acc.some((phase) => phase.phaseType === table.phase)) {
                    acc.push({ phaseType: table.phase as PhaseType, name: table.name });
                }
            });
            return acc;
        }, [] as Phase[]);
    }
}
