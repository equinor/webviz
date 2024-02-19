import { PressureDependentVariable, PvtTableCollection } from "../typesAndEnums";

export class PvtDataAccessor {
    private _tableCollections: PvtTableCollection[];
    private _pressureUnit = "";
    private _units: Map<PressureDependentVariable, string> = new Map();

    constructor(tableCollections: PvtTableCollection[]) {
        this._tableCollections = tableCollections;
        this.extractUnits();
    }

    getTableCollections(): PvtTableCollection[] {
        return this._tableCollections;
    }

    getUniquePvtNums(): number[] {
        return Array.from(new Set(this._tableCollections.flatMap((el) => el.tables.map((el) => el.pvtnum))));
    }

    getPressureUnit(): string {
        return this._pressureUnit;
    }

    getDependentVariableUnit(variable: PressureDependentVariable): string {
        return this._units.get(variable) || "";
    }

    private extractUnits() {
        for (const tableCollection of this._tableCollections) {
            for (const table of tableCollection.tables) {
                this._units.set(PressureDependentVariable.FORMATION_VOLUME_FACTOR, table.volumefactor_unit);
                this._units.set(PressureDependentVariable.VISCOSITY, table.viscosity_unit);
                this._units.set(PressureDependentVariable.DENSITY, table.density_unit);
                this._units.set(PressureDependentVariable.FLUID_RATIO, table.ratio_unit);
                this._pressureUnit = table.pressure_unit;
            }
        }
    }
}
