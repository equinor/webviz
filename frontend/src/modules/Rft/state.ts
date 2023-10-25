export interface RftWellAddress {
    addressType: "realizations";
    caseUuid: string;
    ensemble: string;
    wellName: string;
    responseName: string;
    realizationNums: number[] | null

}
export default interface State { rftWellAddress: RftWellAddress | null }
