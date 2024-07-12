import { InplaceVolumetricsIdentifier_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import { InplaceVolumetricsTablesDataAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsDataAccessor";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { PlotData } from "plotly.js";

export enum SubplotBy {
    ENSEMBLE = "ensemble",
    TABLE_NAME = "table-name",
    FLUID_ZONE = "fluidZone",
    IDENTIFIER = "identifier",
}

export type SubplotByInfo =
    | {
          subplotBy: Exclude<SubplotBy, SubplotBy.IDENTIFIER>;
      }
    | {
          subplotBy: SubplotBy.IDENTIFIER;
          identifier: InplaceVolumetricsIdentifier_api;
      };

type TablesData = {
    label: string;
    tables: TableData[];
};

export type TableData = {
    columns: Record<string, number[]>;
};

export class InplaceVolumetricsPlotBuilder {
    private _dataAccessor: InplaceVolumetricsTablesDataAccessor;
    private _plottingFunction: ((data: TableData[]) => Partial<PlotData>[]) | null = null;
    private _subplotByInfo: SubplotByInfo = { subplotBy: SubplotBy.TABLE_NAME };
    private _colorBy: SubplotBy = SubplotBy.ENSEMBLE;

    constructor(dataAccessor: InplaceVolumetricsTablesDataAccessor) {
        this._dataAccessor = dataAccessor;
    }

    setSubplotBy(subplotByInfo: SubplotByInfo) {
        this._subplotByInfo = subplotByInfo;
    }

    setPlottingFunction(plottingFunction: (data: TableData[]) => Partial<PlotData>[]) {
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
                const index = (row - 1) * numCols + (col - 1);

                const adjustedIndex = (numRows - 1 - (row - 1)) * numCols + (col - 1);
                subplotTitles.push(tablesData[adjustedIndex]?.label ?? "");

                if (index >= tablesData.length) {
                    continue;
                }

                const plotDataArr = this._plottingFunction(tablesData[index].tables);
                for (const plotData of plotDataArr) {
                    traces.push({ row, col, trace: plotData });
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

    makeSubplotTables(): TablesData[] {
        const tablesData: TablesData[] = [];
        if (this._subplotByInfo.subplotBy === SubplotBy.ENSEMBLE) {
            if (this._dataAccessor.getTableNames().length > 1 && this._colorBy !== SubplotBy.TABLE_NAME) {
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
                    label: ensembleIdent.toString(),
                    tables,
                });
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.TABLE_NAME) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy !== SubplotBy.ENSEMBLE) {
                throw new Error(
                    "Must color by ensemble when subplotting by table name and there is more than one ensemble"
                );
            }

            const tableNames = this._dataAccessor.getTableNames();
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
                    tables,
                });
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.FLUID_ZONE) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._dataAccessor.getTableNames().length > 1) {
                throw new Error("Cannot subplot by fluid zone when there is more than one ensemble and table name");
            }
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy !== SubplotBy.ENSEMBLE) {
                throw new Error(
                    "Must color by ensemble when subplotting by fluid zone and there is more than one ensemble"
                );
            }

            const fluidZones = this._dataAccessor.getFluidZones();
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
                    tables,
                });
            }
        } else if (this._subplotByInfo.subplotBy === SubplotBy.IDENTIFIER) {
            if (this._dataAccessor.getEnsembleIdents().length > 1 && this._colorBy !== SubplotBy.ENSEMBLE) {
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
                for (const subTable of this._dataAccessor.getTables()) {
                    const matchingRows = subTable.getRowsWithFilter(identifierName, identifier);
                    const columns: Record<string, number[]> = {};
                    for (const row of matchingRows) {
                        for (const [column, value] of Object.entries(row)) {
                            if (column in subTable.getResultColumns()) {
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
                    label: identifierName,
                    tables,
                });
            }
        }

        return tablesData;
    }
}
