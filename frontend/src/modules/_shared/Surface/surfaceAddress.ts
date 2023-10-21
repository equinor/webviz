import { SurfaceStatisticFunction_api } from "@api";

export interface RealizationSurfaceAddress {
    addressType: "realization";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
    isoDateOrInterval: string | null;
}
export interface ObservedSurfaceAddress {
    addressType: "observation";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    isoDateOrInterval: string | null;
}
export interface StatisticalSurfaceAddress {
    addressType: "statistical";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    isoDateOrInterval: string | null;
    statisticFunction: SurfaceStatisticFunction_api;
}

export type SurfaceAddress = RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress;

export function makeSurfaceAddressString(addr: SurfaceAddress): string {
    const valueArr = Object.values(addr);
    const str = valueArr.join("--");
    return str;
}

export class SurfaceAddressFactory {
    private _caseUuid: string;
    private _ensemble: string;
    private _name: string;
    private _attribute: string;
    private _isoDateOrInterval: string | null;

    constructor(caseUuid: string, ensemble: string, name: string, attribute: string, isoDateOrInterval: string | null) {
        this._caseUuid = caseUuid;
        this._ensemble = ensemble;
        this._name = name;
        this._attribute = attribute;
        this._isoDateOrInterval = isoDateOrInterval;
    }

    createRealizationAddress(realizationNum: number): RealizationSurfaceAddress {
        return {
            addressType: "realization",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realizationNum: realizationNum,
            isoDateOrInterval: this._isoDateOrInterval,
        };
    }
    createObservedAddress(): ObservedSurfaceAddress {
        return {
            addressType: "observation",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            isoDateOrInterval: this._isoDateOrInterval,
        };
    }
    createStatisticalAddress(statFunction: SurfaceStatisticFunction_api): StatisticalSurfaceAddress {
        return {
            addressType: "statistical",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            isoDateOrInterval: this._isoDateOrInterval,
            statisticFunction: statFunction,
        };
    }
}
