export interface PvtPlotData {
    pressure: number[];
    pressureUnit: string;
    y: number[];
    yUnit: string;
    ratio: number[];
    pvtNum: number;
    phaseType: string;
    title: string;
}
export default interface state { pvtVisualizations: string[] | null, pvtNum: number | null, pvtName: string | null, groupBy: string, realization: number | null, pvtPlotDataSet: PvtPlotData[] | null }
