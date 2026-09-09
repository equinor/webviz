import type { StdResAttribute_api, SurfaceStandardResult_api, SurfaceStatisticFunction_api, TagNameAttribute_api } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

export type SurfaceAttribute = TagNameAttribute_api | StdResAttribute_api;

export interface RealizationSurfaceAddress {
    addressType: "REAL";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: SurfaceAttribute;
    realizationNum: number;
    isoTimeOrInterval: string | null;
}

export interface ObservedSurfaceAddress {
    addressType: "OBS";
    caseUuid: string;
    name: string;
    attribute: SurfaceAttribute;
    isoTimeOrInterval: string;
}

export interface StatisticalSurfaceAddress {
    addressType: "STAT";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: SurfaceAttribute;
    statFunction: SurfaceStatisticFunction_api;
    statRealizations: number[] | null;
    isoTimeOrInterval: string | null;
}

export type AnySurfaceAddress = RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress;

const SurfaceAddressTypeValues = ["REAL", "OBS", "STAT"] as const;
export type SurfaceAddressType = (typeof SurfaceAddressTypeValues)[number];

const ADDR_COMP_DELIMITER = "~~";

export function makeTagNameAttribute(tagName: string): TagNameAttribute_api {
    return { kind: "TAGNAME", tag_name: tagName };
}

export function makeStdResAttribute(
    stdResName: SurfaceStandardResult_api,
    subName: string | null = null,
): StdResAttribute_api {
    return { kind: "STDRES", std_res_name: stdResName, sub_name: subName };
}

// The attribute always spans three components so the fields after it sit at fixed positions
function attributeToComponents(attr: SurfaceAttribute): string[] {
    if (attr.kind === "TAGNAME") {
        return ["TAGNAME", attr.tag_name, ""];
    }

    return ["STDRES", attr.std_res_name, attr.sub_name ?? ""];
}

export function encodeRealizationSurfAddrStr(addr: Omit<RealizationSurfaceAddress, "addressType">): string {
    const componentArr = [
        "REAL",
        addr.caseUuid,
        addr.ensemble,
        addr.name,
        ...attributeToComponents(addr.attribute),
        addr.realizationNum,
    ];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    return componentArr.join(ADDR_COMP_DELIMITER);
}

export function encodeObservedSurfAddrStr(addr: Omit<ObservedSurfaceAddress, "addressType">): string {
    const componentArr = [
        "OBS",
        addr.caseUuid,
        addr.name,
        ...attributeToComponents(addr.attribute),
        addr.isoTimeOrInterval,
    ];

    assertThatNoComponentsContainDelimiter(componentArr);

    return componentArr.join(ADDR_COMP_DELIMITER);
}

export function encodeStatisticalSurfAddrStr(addr: Omit<StatisticalSurfaceAddress, "addressType">): string {
    let realStr = "*";
    if (addr.statRealizations != null) {
        realStr = encodeAsUintListStr(addr.statRealizations);
    }

    const componentArr = [
        "STAT",
        addr.caseUuid,
        addr.ensemble,
        addr.name,
        ...attributeToComponents(addr.attribute),
        addr.statFunction,
        realStr,
    ];
    if (addr.isoTimeOrInterval !== null) {
        componentArr.push(addr.isoTimeOrInterval);
    }

    assertThatNoComponentsContainDelimiter(componentArr);

    return componentArr.join(ADDR_COMP_DELIMITER);
}

export function encodeSurfAddrStr(addr: AnySurfaceAddress): string {
    switch (addr.addressType) {
        case "REAL":
            return encodeRealizationSurfAddrStr(addr);
        case "OBS":
            return encodeObservedSurfAddrStr(addr);
        case "STAT":
            return encodeStatisticalSurfAddrStr(addr);
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

export function peekSurfaceCaseUuid(surfAddrStr: string): string | null {
    const components = surfAddrStr.split(ADDR_COMP_DELIMITER);
    if (components.length < 2) {
        return null;
    }

    return components[1];
}

export function peekSurfaceEnsemble(surfAddrStr: string): string | null {
    const components = surfAddrStr.split(ADDR_COMP_DELIMITER);
    const addrType = peekSurfaceAddressType(surfAddrStr);
    if (!addrType || addrType === "OBS" || components.length < 3) {
        return null;
    }

    return components[2];
}

function assertThatNoComponentsContainDelimiter(componentArr: Array<string | number>): void {
    for (const comp of componentArr) {
        if (typeof comp === "string" && comp.includes(ADDR_COMP_DELIMITER)) {
            throw new Error(`Address component contains delimiter, offending component: ${comp}`);
        }
    }
}
