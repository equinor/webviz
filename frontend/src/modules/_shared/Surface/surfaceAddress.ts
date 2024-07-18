import { SurfaceStatisticFunction_api } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

export interface RealizationSurfaceAddress {
    addressType: "REAL";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
    isoTimeOrInterval: string | null;
}

export interface ObservedSurfaceAddress {
    addressType: "OBS";
    caseUuid: string;
    name: string;
    attribute: string;
    isoTimeOrInterval: string;
}

export interface StatisticalSurfaceAddress {
    addressType: "STAT";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    statFunction: SurfaceStatisticFunction_api;
    statRealizations: number[] | null;
    isoTimeOrInterval: string | null;
}

export interface PartialSurfaceAddress {
    addressType: "PARTIAL";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    isoTimeOrInterval: string | null;
}

export type FullSurfaceAddress = RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress;

export type AnySurfaceAddress =
    | RealizationSurfaceAddress
    | ObservedSurfaceAddress
    | StatisticalSurfaceAddress
    | PartialSurfaceAddress;

const SurfaceAddressTypeValues = ["REAL", "OBS", "STAT", "PARTIAL"] as const;
export type SurfaceAddressType = (typeof SurfaceAddressTypeValues)[number];

const ADDR_COMP_DELIMITER = "~~";

export function encodeRealizationSurfAddrStr(addr: Omit<RealizationSurfaceAddress, "addressType">): string {
    const componentArr = ["REAL", addr.caseUuid, addr.ensemble, addr.name, addr.attribute, addr.realizationNum];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    const addrStr = componentArr.join(ADDR_COMP_DELIMITER);
    return addrStr;
}

export function encodeObservedSurfAddrStr(addr: Omit<ObservedSurfaceAddress, "addressType">): string {
    const componentArr = ["OBS", addr.caseUuid, addr.name, addr.attribute];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    const addrStr = componentArr.join(ADDR_COMP_DELIMITER);
    return addrStr;
}

export function encodeStatisticalSurfAddrStr(addr: Omit<StatisticalSurfaceAddress, "addressType">): string {
    let realStr = "*";
    if (addr.statRealizations != null) {
        realStr = encodeAsUintListStr(addr.statRealizations);
    }

    const componentArr = ["STAT", addr.caseUuid, addr.ensemble, addr.name, addr.attribute, addr.statFunction, realStr];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    const addrStr = componentArr.join(ADDR_COMP_DELIMITER);
    return addrStr;
}

export function encodePartialSurfAddrStr(addr: Omit<PartialSurfaceAddress, "addressType">): string {
    const componentArr = ["PARTIAL", addr.caseUuid, addr.ensemble, addr.name, addr.attribute];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    const addrStr = componentArr.join(ADDR_COMP_DELIMITER);
    return addrStr;
}

export function encodeSurfAddrStr(addr: AnySurfaceAddress): string {
    switch (addr.addressType) {
        case "REAL":
            return encodeRealizationSurfAddrStr(addr);
        case "OBS":
            return encodeObservedSurfAddrStr(addr);
        case "STAT":
            return encodeStatisticalSurfAddrStr(addr);
        case "PARTIAL":
            return encodePartialSurfAddrStr(addr);
        default:
            throw new Error("Invalid address type");
    }
}

export function peekSurfaceAddressType(surfAddrStr: string): SurfaceAddressType | null {
    const addrTypeStr = surfAddrStr.split(ADDR_COMP_DELIMITER)[0];

    const foundAddrType = SurfaceAddressTypeValues.find((val) => val === addrTypeStr);
    if (!foundAddrType) {
        return null;
    }

    return foundAddrType;
}


function assertThatNoComponentsContainDelimiter(componentArr: Array<string | number>): void {
    for (const comp of componentArr) {
        if (typeof comp === "string" && comp.includes(ADDR_COMP_DELIMITER)) {
            throw new Error(`Address component contains delimiter, offending component: ${comp}`);
        }
    }
}
