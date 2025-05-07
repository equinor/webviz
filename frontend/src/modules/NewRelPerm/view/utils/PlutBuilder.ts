import { ColorSet } from "@lib/utils/ColorSet";
import { Figure, makeSubplots } from "@modules/_shared/Figure";

import { RelPermSpec } from "../../typesAndEnums";

export enum SubplotOwner {
    CURVE = "Curve",
    ENSEMBLE = "Ensemble",
    SATNUM = "SatNum",
}

/**
    Helper class to build wanted plot component by use of plot figure, with subplot per selected vector
    or per selected ensemble according to grouping selection.

 */
export class PlotBuilder {
    private _selectedRelPermSpecs: RelPermSpec[] = [];
    private _numberOfSubplots: number = 0;
    private _subplotOwner: SubplotOwner;
    private _figure: Figure;
    private _numRows = 1;
    private _numCols = 1;
    private _width = 0;
    private _height = 0;
    constructor(
        subplotOwner: SubplotOwner,
        selectedRelPermSpecs: RelPermSpec[],
        colorSet: ColorSet,
        width: number,
        height: number,
        scatterType: "scatter" | "scattergl" = "scatter",
    ) {
        this._selectedRelPermSpecs = selectedRelPermSpecs;
        this._numberOfSubplots = selectedRelPermSpecs.length;
        this._subplotOwner = subplotOwner;
        this._figure = makeSubplots({
            numCols: this._numCols,
            numRows: this._numRows,
            height: this._height,
            width: this._width,
            margin: { t: 30, b: 40, l: 40, r: 40 },
            title: this._numberOfSubplots === 0 ? "Select curves to visualize" : undefined,
            xAxisType: "date",
            showGrid: true,
            sharedXAxes: "all",
        });
    }
}
