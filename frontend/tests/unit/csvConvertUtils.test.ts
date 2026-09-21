import { describe, expect, test } from "vitest";

import { convertRowsToCsvContentString, escapeCsvValue } from "@lib/utils/csvConvertUtils";

describe("escapeCsvValue", () => {
    test("plain string is unchanged", () => {
        expect(escapeCsvValue("abc")).toBe("abc");
    });

    test("number is stringified", () => {
        expect(escapeCsvValue(42)).toBe("42");
    });

    test("comma is quoted", () => {
        expect(escapeCsvValue("a,b")).toBe('"a,b"');
    });

    test("double quote is quoted and doubled", () => {
        expect(escapeCsvValue('a"b')).toBe('"a""b"');
    });

    test("newline is quoted", () => {
        expect(escapeCsvValue("a\nb")).toBe('"a\nb"');
    });
});

describe("convertRowsToCsvContentString", () => {
    test("single header row and data rows joined by newline", () => {
        const content = convertRowsToCsvContentString({
            headerRows: [["A", "B"]],
            dataRows: [
                [1, 2],
                [3, 4],
            ],
        });
        expect(content).toBe("A,B\n1,2\n3,4");
    });

    test("two header rows are preserved in order", () => {
        const content = convertRowsToCsvContentString({
            headerRows: [
                ["A", "A"],
                ["Mean", "P10"],
            ],
            dataRows: [[1, 2]],
        });
        expect(content).toBe("A,A\nMean,P10\n1,2");
    });

    test("empty string values produce empty fields", () => {
        const content = convertRowsToCsvContentString({
            headerRows: [["A", "B"]],
            dataRows: [["", 1]],
        });
        expect(content).toBe("A,B\n,1");
    });

    test("no trailing newline and no BOM", () => {
        const content = convertRowsToCsvContentString({
            headerRows: [["A"]],
            dataRows: [[1]],
        });
        expect(content.endsWith("\n")).toBe(false);
        expect(content.charCodeAt(0)).not.toBe(0xfeff);
    });
});
