import { PvtData_api } from '@api'

export class PvtQueryDataAccessor {
    private _pvtQueryData: PvtData_api[];


    constructor(pvtQueryData: PvtData_api[]) {
        this._pvtQueryData = pvtQueryData;
    }

    getPvtNames(): string[] {
        return [... new Set(this._pvtQueryData.map((pvtData) => pvtData.name))]
    }

    getPvtNums(pvtName: string): number[] {
        const data = this._pvtQueryData.filter((pvtData) => pvtData.name == pvtName);
        return data.map((pvtData) => pvtData.pvtnum);

    }

    getPvtData(pvtName: string, pvtNum: number): PvtData_api {
        const data = this._pvtQueryData.filter((pvtData) => (pvtData.name == pvtName && pvtData.pvtnum == pvtNum));
        return data[0];
    }

}



