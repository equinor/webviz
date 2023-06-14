import { SurfaceStatisticFunction_api } from "@api";

export interface StaticSurfAddr {
    addressType: "static";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
}

export interface DynamicSurfAddr {
    addressType: "dynamic";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
    timeOrInterval: string;
}

export interface StatisticalStaticSurfAddr {
    addressType: "statistical-static";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    statisticFunction: SurfaceStatisticFunction_api;
}

export interface StatisticalDynamicSurfAddr {
    addressType: "statistical-dynamic";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    timeOrInterval: string;
    statisticFunction: SurfaceStatisticFunction_api;
}

export type SurfAddr = StaticSurfAddr | DynamicSurfAddr | StatisticalDynamicSurfAddr | StatisticalStaticSurfAddr;

export function makeSurfAddrString(addr: SurfAddr): string {
    const valueArr = Object.values(addr);
    const str = valueArr.join("--");
    return str;
}

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

    createDynamicAddr(realizationNum: number, timeOrInterval: string): DynamicSurfAddr {
        return {
            addressType: "dynamic",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realizationNum: realizationNum,
            timeOrInterval: timeOrInterval,
        };
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

    createStatisticalDynamicAddr(
        statFunction: SurfaceStatisticFunction_api,
        timeOrInterval: string
    ): StatisticalDynamicSurfAddr {
        return {
            addressType: "statistical-dynamic",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            timeOrInterval: timeOrInterval,
            statisticFunction: statFunction,
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
