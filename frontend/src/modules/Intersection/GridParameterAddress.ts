export interface GridParameterAddress {
    caseUuid: string;
    ensemble: string;
    realizationNum: number;
    gridName: string;
    parameterName: string;
    // timeString?: string;
    lockColorRange: boolean;
    colorMin?: number | null;
    colorMax?: number | null;
}
