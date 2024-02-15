export interface PvtPlotData {
    pvtNum: number;
    pvtName: string;
    pvtPlot: string;
}
export interface State {
    pvtVisualizations: string[] | null;
    pvtNum: number | null;
    pvtName: string | null;
    groupBy: string;
    realization: number | null;
    activeDataSet: PvtPlotData[] | null;
}
