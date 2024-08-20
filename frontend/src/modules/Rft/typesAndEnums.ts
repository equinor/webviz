export type RftWellAddress = {
    addressType: "realizations";
    caseUuid: string;
    ensembleName: string;
    wellName: string;
    responseName: string;
    timePoint: number;
    realizationNums: number[] | null;
};
