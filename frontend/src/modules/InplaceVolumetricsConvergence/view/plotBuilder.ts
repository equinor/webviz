import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorSet } from "@lib/utils/ColorSet";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import { InplaceVolumetricsTablesDataAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { PlotData } from "plotly.js";

import { SubplotBy, SubplotByInfo } from "./types";

type TablesData = {
    label: string;
    tables: TableData[];
};

export type TableData = {
    color: string;
    columns: Record<string, number[]>;
};

export class InplaceVolumetricsPlotBuilder {
    private _dataAccessor: InplaceVolumetricsTablesDataAccessor;
    private _plottingFunction: ((data: TableData) => Partial<PlotData>[]) | null = null;
    private _subplotByInfo: SubplotByInfo = { subplotBy: SubplotBy.TABLE_NAME };
    private _colorBy: SubplotByInfo = { subplotBy: SubplotBy.ENSEMBLE };
    private _ensembleSet: EnsembleSet;
    private _colorSet: ColorSet;

    constructor(dataAccessor: InplaceVolumetricsTablesDataAccessor, ensembleSet: EnsembleSet, colorSet: ColorSet) {
        this._dataAccessor = dataAccessor;
        this._ensembleSet = ensembleSet;
        this._colorSet = colorSet;
    }

    setSubplotBy(subplotByInfo: SubplotByInfo) {
        this._subplotByInfo = subplotByInfo;
    }

    setColorBy(colorBy: SubplotByInfo) {
        this._colorBy = colorBy;
    }

    setPlottingFunction(plottingFunction: (data: TableData) => Partial<PlotData>[]) {
        this._plottingFunction = plottingFunction;
    }

    build(height: number, width: number): Figure | null {
        if (this._plottingFunction === null) {
            return null;
        }

        const tablesData = this.makeSubplotTables();
        const numRows = Math.ceil(Math.sqrt(tablesData.length));
        const numCols = Math.ceil(tablesData.length / numRows);

        const traces: { row: number; col: number; trace: Partial<PlotData> }[] = [];
        const subplotTitles: string[] = [];

        for (let row = 1; row <= numRows; row++) {
            for (let col = 1; col <= numCols; col++) {
                const index = (numRows - 1 - (row - 1)) * numCols + (col - 1);
                if (!tablesData[index]) {
                    continue;
                }
                const { label, tables } = tablesData[index];

                for (const table of tables) {
                    const plotDataArr = this._plottingFunction(table);
                    for (const plotData of plotDataArr) {
                        traces.push({ row, col, trace: plotData });
                    }
                }
            }
        }

        const figure = makeSubplots({
            height: height,
            width: width,
            numRows,
            numCols,
            horizontalSpacing: 0.075,
            verticalSpacing: 0.075,
            showGrid: true,
            margin: { t: 50, b: 20, l: 50, r: 20 },
            subplotTitles,
        });

        for (const { trace, row, col } of traces) {
            figure.addTrace(trace, row, col);
        }

        return figure;
    }

    private makeColor();

    private makeSubplotTables(): TablesData[] {
        const tablesData: TablesData[] = [];
        if (this._subplotByInfo.subplotBy === SubplotBy.ENSEMBLE) {
            if (this._dataAccessor.getTableNames().length > 1 && this._colorBy.subplotBy !== SubplotBy.TABLE_NAME) {
                throw new Error(
                    "Must color by table name when subplotting by ensemble and there is more than one table name"
                );
            }

            const ensembleIdents = this._dataAccessor.getEnsembleIdents();
            for (const ensembleIdent of ensembleIdents) {
                const tables: TableData[] = [];
                for (const subTable of this._dataAccessor.getTablesForEnsembleIdent(ensembleIdent)) {
                    const resultColumns = subTable.getResultColumns();
                    const realizations = subTable.getRealizationColumnValues();
                    const columns: Record<string, number[]> = {
                        realization: realizations,
                    };
                    for (const column of resultColumns) {
                        columns[column] = subTable.getColumnValues(column).map((el) => parseFloat(el.toString()));
                    }
                    const tableData: TableData = {
                        columns,
                    };
                    tables.push(tableData);
                }
                tablesData.push({
                    label: makeDistinguishableEnsembleDisplayName(ensembleIdent, this._ensembleSet.getEnsembleArr()),
                    color: this._ensembleSet.findEnsemble(ensembleIdent)?.getColor() ?? "black",
                    tables,
                });
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.TABLE_NAME) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy.subplotBy !== SubplotBy.ENSEMBLE) {
                throw new Error(
                    "Must color by ensemble when subplotting by table name and there is more than one ensemble"
                );
            }

            const tableNames = this._dataAccessor.getTableNames();
            let color = this._colorSet.getFirstColor();
            for (const tableName of tableNames) {
                const tables: TableData[] = [];
                for (const subTable of this._dataAccessor.getTablesForTableName(tableName)) {
                    const resultColumns = subTable.getResultColumns();
                    const realizations = subTable.getRealizationColumnValues();
                    const columns: Record<string, number[]> = {
                        realization: realizations,
                    };
                    for (const column of resultColumns) {
                        columns[column] = subTable.getColumnValues(column).map((el) => parseFloat(el.toString()));
                    }
                    const tableData: TableData = {
                        columns,
                    };
                    tables.push(tableData);
                }
                tablesData.push({
                    label: tableName,
                    color,
                    tables,
                });
                color = this._colorSet.getNextColor();
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.FLUID_ZONE) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._dataAccessor.getTableNames().length > 1) {
                throw new Error("Cannot subplot by fluid zone when there is more than one ensemble and table name");
            }
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy.subplotBy !== SubplotBy.ENSEMBLE) {
                throw new Error(
                    "Must color by ensemble when subplotting by fluid zone and there is more than one ensemble"
                );
            }

            const fluidZones = this._dataAccessor.getFluidZones();
            let color = this._colorSet.getFirstColor();
            for (const fluidZone of fluidZones) {
                const tables: TableData[] = [];
                for (const subTable of this._dataAccessor.getTablesForFluidZone(fluidZone)) {
                    const resultColumns = subTable.getResultColumns();
                    const realizations = subTable.getRealizationColumnValues();
                    const columns: Record<string, number[]> = {
                        realization: realizations,
                    };
                    for (const column of resultColumns) {
                        columns[column] = subTable.getColumnValues(column).map((el) => parseFloat(el.toString()));
                    }
                    const tableData: TableData = {
                        columns,
                    };
                    tables.push(tableData);
                }
                tablesData.push({
                    label: fluidZone,
                    color,
                    tables,
                });
                color = this._colorSet.getNextColor();
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.IDENTIFIER) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy.subplotBy !== SubplotBy.ENSEMBLE) {
                throw new Error(
                    "Must color by ensemble when subplotting by identifier and there is more than one ensemble"
                );
            }
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._dataAccessor.getTableNames().length > 1) {
                throw new Error("Cannot subplot by identifier when there is more than one ensemble and table name");
            }
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._dataAccessor.getFluidZones().length > 1) {
                throw new Error("Cannot subplot by identifier when there is more than one ensemble and fluid zone");
            }
            if (this._dataAccessor.getFluidZones().length > 1 && this._dataAccessor.getTableNames().length > 1) {
                throw new Error("Cannot subplot by identifier when there is more than one fluid zone and table name");
            }

            const identifierName = this._subplotByInfo.identifier;
            const identifiers = this._dataAccessor.getColumnValuesIntersection(identifierName);
            for (const identifier of identifiers) {
                const tables: TableData[] = [];
                let color = this._colorSet.getFirstColor();
                for (const subTable of this._dataAccessor.getTables()) {
                    const matchingRows = subTable.getRowsWithFilter(identifierName, identifier);
                    const realizations = subTable.getRealizationColumnValues();
                    const columns: Record<string, number[]> = {
                        realization: realizations,
                    };
                    const subTableResultColumns = subTable.getResultColumns();
                    for (const row of matchingRows) {
                        for (const [column, value] of Object.entries(row)) {
                            if (subTableResultColumns.includes(column)) {
                                if (!columns[column]) {
                                    columns[column] = [];
                                }
                                columns[column] = [...columns[column], parseFloat(value.toString())];
                            }
                        }
                    }
                    const tableData: TableData = {
                        columns,
                    };
                    tables.push(tableData);
                }
                tablesData.push({
                    label: identifier.toString(),
                    color,
                    tables,
                });
                color = this._colorSet.getNextColor();
            }
        }

        return tablesData;
    }
}
