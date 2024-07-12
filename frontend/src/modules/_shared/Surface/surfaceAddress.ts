import { SurfaceStatisticFunction_api } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";


export interface RealSurfAddr {
    addressType: "REAL";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizationNum: number;
    isoTimeOrInterval: string | null;
}

export interface ObsSurfAddr {
    addressType: "OBS";
    caseUuid: string;
    name: string;
    attribute: string;
    isoTimeOrInterval: string;
}

export interface StatSurfAddr {
    addressType: "STAT";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    statFunction: SurfaceStatisticFunction_api;
    statRealizations: number[] | null;
    isoTimeOrInterval: string | null;
}

export interface PartialSurfAddr {
    addressType: "PARTIAL";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    isoTimeOrInterval: string | null;
}

export type FullSurfAddr = RealSurfAddr | ObsSurfAddr | StatSurfAddr;

export type AnySurfAddr = RealSurfAddr | ObsSurfAddr | PartialSurfAddr | StatSurfAddr;


//export type AddrTypes = "REAL" | "OBS" | "STAT" | "PARTIAL";

const AddrTypeValues = ["REAL", "OBS", "STAT", "PARTIAL"] as const; 
export type AddrTypes = typeof AddrTypeValues[number]; 



const DELIMITER = "~~";

export function encodeRealSurfAddrStr(addr: Omit<RealSurfAddr, "addressType">): string {
    const componentArr = ["REAL", addr.caseUuid, addr.ensemble, addr.name, addr.attribute, addr.realizationNum]
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    const addrStr = componentArr.join(DELIMITER);
    return addrStr;
}

export function encodeObsSurfAddrStr(addr: Omit<ObsSurfAddr, "addressType">): string {
    const componentArr = ["OBS", addr.caseUuid, addr.name, addr.attribute]
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    const addrStr = componentArr.join(DELIMITER);
    return addrStr;
}

export function encodeStatSurfAddrStr(addr: Omit<StatSurfAddr, "addressType">): string {
    let realizationsStr = "*";
    if (addr.statRealizations != null) {
        realizationsStr = encodeAsUintListStr(addr.statRealizations);
    }

    const componentArr = ["STAT", addr.caseUuid, addr.ensemble, addr.name, addr.attribute, addr.statFunction, realizationsStr]
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    const addrStr = componentArr.join(DELIMITER);
    return addrStr;
}

export function encodePartialSurfAddrStr(addr: Omit<PartialSurfAddr, "addressType">): string {
    const componentArr = ["PARTIAL", addr.caseUuid, addr.ensemble, addr.name, addr.attribute]
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    const addrStr = componentArr.join(DELIMITER);
    return addrStr;
}

export function encodeSurfAddrStr(addr: AnySurfAddr): string {
    switch (addr.addressType) {
        case "REAL":
            return encodeRealSurfAddrStr(addr);
        case "OBS":
            return encodeObsSurfAddrStr(addr);
        case "STAT":
            return encodeStatSurfAddrStr(addr);
        case "PARTIAL":
            return encodePartialSurfAddrStr(addr);
        default:
            throw new Error("Invalid address type");
    }
}


export function peekSurfAddrType(surfAddrStr: string): AddrTypes {
    const addrTypeStr = surfAddrStr.split(DELIMITER)[0];

    const foundAddrType = AddrTypeValues.find((val) => val === addrTypeStr);
    if (!foundAddrType) {
        throw new Error(`Invalid surface address type in : ${surfAddrStr}`);
    }

    return foundAddrType;
}


