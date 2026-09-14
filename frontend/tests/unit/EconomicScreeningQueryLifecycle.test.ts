import { QueryClient } from "@tanstack/react-query";
import { createStore } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { describe, expect, test, vi } from "vitest";

import type * as Api from "@api";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { DiscountConvention, InvestmentTiming } from "@modules/EconomicScreening/typesAndEnums";
import {
    discountAssumptionsAtom,
    salesGasStrategyAtom,
    ensembleIdentAtom,
} from "@modules/EconomicScreening/view/atoms/baseAtoms";
import { automaticBaseYearVectorDataQueriesAtom } from "@modules/EconomicScreening/view/atoms/queryAtoms";

type VectorRequest = {
    case_uuid: string;
    ensemble_name: string;
    vector_name: string;
    realizations_encoded_as_uint_list_str: string | null;
};

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
};

const requests: VectorRequest[] = [];
const executedRequestKeys: string[] = [];
const deferredResponses = new Map<string, Deferred<Api.VectorRealizationData_api[]>>();

function makeDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

vi.mock("@api", async (importOriginal) => {
    const actual = await importOriginal<typeof Api>();
    return {
        ...actual,
        getRealizationsVectorDataOptions: vi.fn(({ query }: { query: VectorRequest }) => {
            requests.push(query);
            const response = makeDeferred<Api.VectorRealizationData_api[]>();
            deferredResponses.set(`${query.case_uuid}:${query.vector_name}`, response);
            return {
                queryKey: ["economic-screening-test", query.case_uuid, query.vector_name],
                queryFn: () => {
                    executedRequestKeys.push(`${query.case_uuid}:${query.vector_name}`);
                    return response.promise;
                },
                retry: false,
            };
        }),
    };
});

function makeEnsemble(caseUuid: string, name: string, realizations: number[]): RegularEnsemble {
    return new RegularEnsemble("asset", [], caseUuid, "case", name, "", realizations, [], null, null, "#123456");
}

async function waitFor(condition: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
        if (condition()) return;
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error(`Condition was not met; options=${requests.length}, executions=${executedRequestKeys.length}`);
}

describe("Economic Screening automatic valuation queries", () => {
    test("does not expose delayed results from the previous ensemble after switching", async () => {
        requests.length = 0;
        executedRequestKeys.length = 0;
        deferredResponses.clear();
        const firstEnsemble = makeEnsemble("11111111-1111-4111-8111-111111111111", "First", [1, 2]);
        const secondEnsemble = makeEnsemble("22222222-2222-4222-8222-222222222222", "Second", [7]);
        EnsembleFingerprintStore.setAll(
            new Map([
                [firstEnsemble.getIdent().toString(), "first-fingerprint"],
                [secondEnsemble.getIdent().toString(), "second-fingerprint"],
            ]),
        );
        const store = createStore();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        store.set(queryClientAtom, queryClient);
        store.set(EnsembleSetAtom, new EnsembleSet([firstEnsemble, secondEnsemble]));
        store.set(salesGasStrategyAtom, { kind: "DIRECT", hasGasConsumption: false });
        store.set(ensembleIdentAtom, firstEnsemble.getIdent());
        store.get(automaticBaseYearVectorDataQueriesAtom);
        const unsubscribe = store.sub(automaticBaseYearVectorDataQueriesAtom, () => {});

        await waitFor(() => executedRequestKeys.length === 2);
        expect(requests).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    case_uuid: firstEnsemble.getCaseUuid(),
                    ensemble_name: "First",
                    realizations_encoded_as_uint_list_str: "1-2",
                }),
            ]),
        );
        store.set(discountAssumptionsAtom, {
            discountRatePercent: 12,
            baseYear: null,
            convention: DiscountConvention.MID_YEAR,
            investmentTiming: InvestmentTiming.START_OF_YEAR,
            gasToOilEquivalentFactor: 1000,
        });
        await Promise.resolve();
        expect(executedRequestKeys).toHaveLength(2);

        store.set(ensembleIdentAtom, secondEnsemble.getIdent());
        await waitFor(() => executedRequestKeys.length === 4);
        deferredResponses.get(`${firstEnsemble.getCaseUuid()}:FOPT`)?.resolve([]);
        deferredResponses.get(`${firstEnsemble.getCaseUuid()}:FGST`)?.resolve([]);
        await Promise.resolve();

        expect(
            store.get(automaticBaseYearVectorDataQueriesAtom).every((result) => result.data === undefined),
        ).toBe(true);
        expect(requests.slice(2)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    case_uuid: secondEnsemble.getCaseUuid(),
                    ensemble_name: "Second",
                    realizations_encoded_as_uint_list_str: "7",
                }),
            ]),
        );

        deferredResponses.get(`${secondEnsemble.getCaseUuid()}:FOPT`)?.resolve([]);
        deferredResponses.get(`${secondEnsemble.getCaseUuid()}:FGST`)?.reject(new Error("source failed"));
        await waitFor(() => store.get(automaticBaseYearVectorDataQueriesAtom).some((result) => result.isError));
        expect(executedRequestKeys).toHaveLength(4);

        unsubscribe();
        queryClient.clear();
        EnsembleFingerprintStore.clear();
    });
});