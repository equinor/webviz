import { KeyType } from "@framework/DataChannelTypes";

export function checkValueIsExpectedType(value: any, type: KeyType): boolean {
    if (type === KeyType.Number) {
        return typeof value === "number";
    }

    if (type === KeyType.NumberTriplet) {
        if (!Array.isArray(value)) {
            return false;
        }

        if (value.length !== 3) {
            return false;
        }

        return value.every((v) => typeof v === "number");
    }

    throw new Error(`Unknown type '${type}'`);
}
