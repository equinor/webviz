import { SurfaceStatisticFunction_api } from "@api";

export interface StaticSurfAddr {
    addressType: "static";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
}

export interface StatisticalStaticSurfAddr {
    addressType: "statistical-static";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    statisticFunction: SurfaceStatisticFunction_api;
}

export type SurfAddr = StaticSurfAddr | StatisticalStaticSurfAddr;

export class SurfAddrFactory {
    private _caseUuid: string;
    private _ensemble: string;
    private _name: string;
    private _attribute: string;

    constructor(caseUuid: string, ensemble: string, name: string, attribute: string) {
        this._caseUuid = caseUuid;
        this._ensemble = ensemble;
        this._name = name;
        this._attribute = attribute;
    }

    createStaticAddr(realizationNum: number): StaticSurfAddr {
        return {
            addressType: "static",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realizationNum: realizationNum,
        };
    }

    createStatisticalStaticAddr(statFunction: SurfaceStatisticFunction_api): StatisticalStaticSurfAddr {
        return {
            addressType: "statistical-static",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            statisticFunction: statFunction,
        };
    }
}
