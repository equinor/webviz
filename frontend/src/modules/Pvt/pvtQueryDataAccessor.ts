import { PvtData } from '@api'

export class PvtQueryDataAccessor {
    private pvtQueryData: PvtData[];


    constructor(pvtQueryData: PvtData[]) {
        this.pvtQueryData = pvtQueryData;
        console.log(this.pvtQueryData)
    }

    getPvtNames(): string[] {
        return [... new Set(this.pvtQueryData.map((pvtData) => pvtData.name))]
    }

    getPvtNums(pvtName: string): number[] {
        const data = this.pvtQueryData.filter((pvtData) => pvtData.name == pvtName);
        return data.map((pvtData) => pvtData.pvtnum);

    }

    getPvtData(pvtName: string, pvtNum: number): PvtData {
        const data = this.pvtQueryData.filter((pvtData) => (pvtData.name == pvtName && pvtData.pvtnum == pvtNum));
        return data[0];
    }

}



