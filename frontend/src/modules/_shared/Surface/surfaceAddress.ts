import {
    ObservationSurfaceAddress_api,
    RealizationSurfaceAddress_api,
    StatisticalSurfaceAddress_api,
    SurfaceAddressType_api,
    SurfaceStatisticFunction_api,
} from "@api";

export type SurfaceAddress =
    | RealizationSurfaceAddress_api
    | StatisticalSurfaceAddress_api
    | ObservationSurfaceAddress_api;

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

    createRealizationAddress(realizationNum: number): RealizationSurfaceAddress_api {
        return {
            address_type: SurfaceAddressType_api.REALIZATION,
            case_uuid: this._caseUuid,
            ensemble_name: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realization_num: realizationNum,
            iso_date_or_interval: this._isoDateOrInterval,
        };
    }
    createObservedAddress(): ObservationSurfaceAddress_api {
        return {
            address_type: SurfaceAddressType_api.OBSERVATION,
            case_uuid: this._caseUuid,
            ensemble_name: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            iso_date_or_interval: this._isoDateOrInterval,
        };
    }
    createStatisticalAddress(statFunction: SurfaceStatisticFunction_api): StatisticalSurfaceAddress_api {
        return {
            address_type: SurfaceAddressType_api.STATISTICAL,
            case_uuid: this._caseUuid,
            ensemble_name: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            iso_date_or_interval: this._isoDateOrInterval,
            statistic_function: statFunction,
        };
    }
}
