import { encodePropertiesAsKeyValStr } from "@lib/utils/queryStringUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import { describe, expect, test } from "vitest";

describe("KeyValStr tests", () => {
    test("Test encoding of object properties into KeyValStr", () => {
        const srcObj = {
            stringKey: "myString",
            boolKey: true,
            numberKey: 123.4,
            nullKey: null,
        };
        expect(encodePropertiesAsKeyValStr(srcObj)).toBe(
            "boolKey~true~~nullKey~null~~numberKey~123.4~~stringKey~'myString'"
        );
    });

    test("Test encoding of object with number keys into KeyValStr", () => {
        const srcObj = {
            1: 1,
            2: "two",
        };
        expect(encodePropertiesAsKeyValStr(srcObj)).toBe("1~1~~2~'two'");
    });

    test("Test encoding of empty object into KeyValStr", () => {
        expect(encodePropertiesAsKeyValStr({})).toBe("");
    });

    test("Test encoding of Map into KeyValStr", () => {
        const srcMap = new Map<string, any>();
        srcMap.set("stringKey", "myString");
        srcMap.set("boolKey", true);
        srcMap.set("numberKey", 123.4);
        srcMap.set("nullKey", null);
        expect(encodePropertiesAsKeyValStr(srcMap)).toBe(
            "boolKey~true~~nullKey~null~~numberKey~123.4~~stringKey~'myString'"
        );
    });

    test("Test encoding of empty Map into KeyValStr", () => {
        expect(encodePropertiesAsKeyValStr(new Map())).toBe("");
    });
});

describe("UintListStr tests", () => {
    test("Test encoding of uint list", () => {
        expect(encodeAsUintListStr([1, 2, 3, 5, 6, 7, 10])).toBe("1-3!5-7!10");
    });

    test("Test encoding of unsorted list with duplicates", () => {
        expect(encodeAsUintListStr([10, 10, 10, 2, 3, 7, 6, 5, 1])).toBe("1-3!5-7!10");
    });

    test("Test encoding of single element list", () => {
        expect(encodeAsUintListStr([1])).toBe("1");
    });

    test("Test encoding of empty list", () => {
        expect(encodeAsUintListStr([])).toBe("");
    });
});
