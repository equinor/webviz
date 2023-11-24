import { Type } from "../../../DataChannelTypes";

export function checkValueIsExpectedType(value: any, type: Type): boolean {
    if (type === Type.Number) {
        return typeof value === "number";
    }

    if (type === Type.String) {
        return typeof value === "string";
    }

    if (type === Type.NumberTriplet) {
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
