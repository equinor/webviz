export interface SmdaWellBoreAddress {
    addressType: "smda";
    uuid: string;
}

export type WellBoreAddress = SmdaWellBoreAddress; // SumoWellBoreAddress, PdmWellBoreAddress, etc...

export function makeWellBoreAddressString(addr: WellBoreAddress): string {
    const valueArr = Object.values(addr);
    const str = valueArr.join("--");
    return str;
}

export class WellBoreAddressFactory {
    createSmdaAddress(uuid: string): SmdaWellBoreAddress {
        return {
            addressType: "smda",
            uuid: uuid,
        };
    }
}
