import { describe, expect, test, vi } from "vitest";

import { ALLOW_WARNINGS_REQUEST_HEADER, parseWarnings, withWarnings, WARNINGS_RESPONSE_HEADER } from "@api";

const HEADER_NAME = WARNINGS_RESPONSE_HEADER.toLowerCase();

describe("parseWarnings", () => {
    test("returns the warnings of a valid header", () => {
        expect(parseWarnings({ [HEADER_NAME]: JSON.stringify(["first", "second"]) })).toEqual(["first", "second"]);
    });

    test.each([
        ["undefined headers", undefined],
        ["missing header", {}],
        ["non-string header value", { [HEADER_NAME]: 42 }],
        ["invalid JSON", { [HEADER_NAME]: "[not json" }],
        ["JSON that is not an array", { [HEADER_NAME]: JSON.stringify({ warning: "text" }) }],
    ])("returns no warnings for %s", (_, headers) => {
        expect(parseWarnings(headers)).toEqual([]);
    });

    test("ignores items that are not strings", () => {
        expect(parseWarnings({ [HEADER_NAME]: JSON.stringify(["valid", 1, null, { a: 1 }, "also valid"]) })).toEqual([
            "valid",
            "also valid",
        ]);
    });
});

describe("withWarnings", () => {
    const generatedOptions = { queryKey: [{ query: { case_uuid: "abc" } }] } as any;

    test("adds the allow warnings header to the query key, keeping the other options", () => {
        const options = withWarnings(generatedOptions, vi.fn());

        expect(options.queryKey).toEqual([
            { query: { case_uuid: "abc" }, headers: { [ALLOW_WARNINGS_REQUEST_HEADER]: "true" } },
        ]);
        expect(generatedOptions.queryKey[0].headers).toBeUndefined();
    });

    test("sends the header with the request and maps the response to value and warnings", async () => {
        const sdkFunction = vi.fn().mockResolvedValue({
            data: [1, 2, 3],
            headers: { [HEADER_NAME]: JSON.stringify(["a warning"]) },
        });
        const options = withWarnings(generatedOptions, sdkFunction);
        const signal = new AbortController().signal;

        const result = await (options.queryFn as any)({ signal });

        expect(result).toEqual({ value: [1, 2, 3], warnings: ["a warning"] });
        expect(sdkFunction).toHaveBeenCalledWith(
            expect.objectContaining({
                query: { case_uuid: "abc" },
                headers: { [ALLOW_WARNINGS_REQUEST_HEADER]: "true" },
                signal,
                throwOnError: true,
            }),
        );
    });

    test("returns no warnings when the response has none", async () => {
        const options = withWarnings(generatedOptions, vi.fn().mockResolvedValue({ data: "x", headers: {} }));

        expect(await (options.queryFn as any)({ signal: undefined })).toEqual({ value: "x", warnings: [] });
    });
});
