import { VfpProdTable_api } from "@api";
import { Size2D } from "@lib/utils/geometry";
import { Figure, makeSubplots } from "@modules/_shared/Figure";
import React from "react";

export class VfpPlotBuilder {
    private _figure: Figure | null = null;
    private _vfpTable: VfpProdTable_api | null = null;

    constructor(vfpTable: VfpProdTable_api){
        this._vfpTable = vfpTable
    }

    makeLayout(size: Size2D) : void {
        const numRows = 1
        const numCols = 1
        const subplotTitles: string[] = ["VFP Table number: " + this._vfpTable?.table_number];
        this._figure = makeSubplots({
            width: size.width,
            height: size.height,
            numRows,
            numCols,
            sharedXAxes: false,
            sharedYAxes: false,
            showGrid: true,
            margin: { t: 30, b: 40, l: 60, r: 10 },
            subplotTitles: subplotTitles,
        });
    }


    makePlot(): React.ReactNode {
        const figure = this.getFigureAndAssertValidity();
        return figure.makePlot();
    }

    private getFigureAndAssertValidity(): Figure {
        if (!this._figure) {
            throw new Error("You have to call the `makeLayout` method first.");
        }

        return this._figure;
    }
}