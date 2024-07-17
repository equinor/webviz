// Encodes the properties of the input object as key-value pairs contained in a single string.
//
// The key-value string is encoded as follows:
// - Each key-value pair is separated by "~~"
// - The key and value are separated by "~" (think of it as assignment)
// - String values are enclosed in single quotes
//
// Only primitive value types are supported: string, number, boolean, null. Non-primitive value types will be ignored
// Only encodes the top level properties of the object and ignores nested objects.
// For maps, only string keys are supported
//
// Example:
// encodedKeyValString = "key1~123.5~~key2~'someString'~~key3~false"
//
export function encodePropertiesAsKeyValStr(objOrMap: object | Map<string, string | number | boolean>): string {
    const KEYVAL_ASSIGN_SEP = "~";
    const KEYVAL_ELEMENT_SEP = "~~";

    const srcKeyValArr = objOrMap instanceof Map ? Array.from(objOrMap.entries()) : Object.entries(objOrMap);

    const elementArr: string[] = [];
    for (const [key, value] of srcKeyValArr) {
        if (typeof key !== "string") {
            throw new Error(`Only string keys are supported, offending key: ${key}`);
        }
        // We only support primitive types
        const valueType = typeof value;
        if (value === null || valueType === "number" || valueType === "boolean") {
            elementArr.push(`${key}${KEYVAL_ASSIGN_SEP}${value}`);
        } else if (valueType === "string") {
            // Add quotes around string values
            elementArr.push(`${key}${KEYVAL_ASSIGN_SEP}'${value}'`);
        }
    }

    // Sort the array to get a deterministic ordering of the elements
    elementArr.sort();

    const keyValStr = elementArr.join(KEYVAL_ELEMENT_SEP);
    return keyValStr;
}

// Encodes an array/set of unsigned integers as a UintListStr formatted string.
//
// Individual integers are represented by the value itself, while consecutive ranges are encoded as <start>-<end>.
// All entries are separated by "!".
//
// Note that the order will not be maintained since the input values will be sorted and all duplicates removed.
//
// Example:
// [1, 2, 3, 5, 6, 7, 10] -> "1-3!5-7!10"
//
export function encodeAsUintListStr(unsignedInts: Iterable<number>): string {
    // Check that all input values are unsigned integers and store them in a Set to remove duplicates
    const uniqueInts = new Set<number>();
    for (const i of unsignedInts) {
        if (!Number.isInteger(i) || i < 0) {
            throw new Error(`All input values must be unsigned integers, offending input: ${i}`);
        }
        uniqueInts.add(i);
    }

    if (uniqueInts.size === 0) {
        return "";
    }

    const sortedUintArr = Uint32Array.from(uniqueInts);
    sortedUintArr.sort();

    const ranges: string[] = [];
    let currentRangeStart = sortedUintArr[0];
    let currentRangeEnd = sortedUintArr[0];
    for (let i = 1; i < sortedUintArr.length; i++) {
        if (sortedUintArr[i] === currentRangeEnd + 1) {
            currentRangeEnd = sortedUintArr[i];
        } else {
            if (currentRangeStart === currentRangeEnd) {
                ranges.push(`${currentRangeStart}`);
            } else {
                ranges.push(`${currentRangeStart}-${currentRangeEnd}`);
            }
            currentRangeStart = sortedUintArr[i];
            currentRangeEnd = sortedUintArr[i];
        }
    }

    if (currentRangeStart === currentRangeEnd) {
        ranges.push(`${currentRangeStart}`);
    } else {
        ranges.push(`${currentRangeStart}-${currentRangeEnd}`);
    }

    // Join the ranges with "!" as separator
    return ranges.join("!");
}
