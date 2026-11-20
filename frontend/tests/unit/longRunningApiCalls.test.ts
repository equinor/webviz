import { describe, expect, test, vi } from "vitest";

import { ALLOW_WARNINGS_REQUEST_HEADER, client, WARNINGS_RESPONSE_HEADER } from "@api";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";

const HEADER_NAME = WARNINGS_RESPONSE_HEADER.toLowerCase();
const WARNING_HEADERS = { [HEADER_NAME]: JSON.stringify(["a warning"]) };

function makeResponse(data: unknown, headers: Record<string, string> = {}) {
    return { data, headers };
}

function makeOptions(queryFn: any, withWarnings?: boolean) {
    return wrapLongRunningQuery({
        queryFn,
        queryFnArgs: { query: { id: "1" } },
        queryKey: [{ query: { id: "1" } }],
        delayBetweenPollsSecs: 0.001,
        withWarnings,
    } as any) as any;
}

async function runQueryFn(options: any) {
    return options.queryFn({ signal: new AbortController().signal });
}

describe("wrapLongRunningQuery", () => {
    test("without warnings it returns the plain result and does not send the allow warnings header", async () => {
        const queryFn = vi
            .fn()
            .mockResolvedValue(makeResponse({ response_type: "LroSuccessResp", result: [1, 2] }, WARNING_HEADERS));
        const options = makeOptions(queryFn);

        expect(await runQueryFn(options)).toEqual([1, 2]);
        expect(queryFn.mock.calls[0][0].headers).toBeUndefined();
        expect(options.queryKey[0].headers).toBeUndefined();
    });

    test("with warnings it returns the result with the warnings of an immediate success", async () => {
        const queryFn = vi
            .fn()
            .mockResolvedValue(makeResponse({ response_type: "LroSuccessResp", result: [1, 2] }, WARNING_HEADERS));
        const options = makeOptions(queryFn, true);

        expect(await runQueryFn(options)).toEqual({ value: [1, 2], warnings: ["a warning"] });
        expect(queryFn.mock.calls[0][0].headers).toEqual({ [ALLOW_WARNINGS_REQUEST_HEADER]: "true" });
        expect(options.queryKey[0].headers).toEqual({ [ALLOW_WARNINGS_REQUEST_HEADER]: "true" });
    });

    test("with warnings it takes the warnings from the response that completes the polling", async () => {
        const queryFn = vi
            .fn()
            .mockResolvedValueOnce(
                makeResponse({ response_type: "LroInProgressResp", task_id: "t1", progress_message: "working" }),
            )
            .mockResolvedValueOnce(makeResponse({ response_type: "LroInProgressResp", task_id: "t1" }))
            .mockResolvedValueOnce(makeResponse({ response_type: "LroSuccessResp", result: "done" }, WARNING_HEADERS));
        const options = makeOptions(queryFn, true);

        expect(await runQueryFn(options)).toEqual({ value: "done", warnings: ["a warning"] });
        expect(queryFn).toHaveBeenCalledTimes(3);
        for (const [callArgs] of queryFn.mock.calls) {
            expect(callArgs.headers).toEqual({ [ALLOW_WARNINGS_REQUEST_HEADER]: "true" });
        }
    });

    test("with warnings it returns no warnings when polling completes without any", async () => {
        const queryFn = vi
            .fn()
            .mockResolvedValueOnce(makeResponse({ response_type: "LroInProgressResp", task_id: "t1" }))
            .mockResolvedValueOnce(makeResponse({ response_type: "LroSuccessResp", result: "done" }));

        expect(await runQueryFn(makeOptions(queryFn, true))).toEqual({ value: "done", warnings: [] });
    });

    test("with warnings it sends the header when polling by url and returns the warnings of the final poll", async () => {
        const queryFn = vi.fn().mockResolvedValue(
            makeResponse({
                response_type: "LroInProgressResp",
                task_id: "t1",
                poll_url: "/poll/t1",
            }),
        );
        const getSpy = vi
            .spyOn(client, "get")
            .mockResolvedValueOnce(
                makeResponse({ response_type: "LroInProgressResp", task_id: "t1", poll_url: "/poll/t1" }) as any,
            )
            .mockResolvedValueOnce(
                makeResponse({ response_type: "LroSuccessResp", result: "done" }, WARNING_HEADERS) as any,
            );

        try {
            expect(await runQueryFn(makeOptions(queryFn, true))).toEqual({ value: "done", warnings: ["a warning"] });
            expect(queryFn).toHaveBeenCalledTimes(1);
            expect(getSpy).toHaveBeenCalledTimes(2);
            for (const [callArgs] of getSpy.mock.calls) {
                expect(callArgs).toMatchObject({
                    url: "/poll/t1",
                    headers: { [ALLOW_WARNINGS_REQUEST_HEADER]: "true" },
                });
            }
        } finally {
            getSpy.mockRestore();
        }
    });
});
