import { beforeEach, describe, expect, test } from "vitest";

import type { Grid3dInfo_api, HydrostaticGridCheckRealizationResult_api, HydrostaticVectorCheckResult_api } from "@api";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { HydrostaticEquilibriumGridPropertyCheckStep } from "@framework/internal/QC/checks/HydrostaticEquilibriumGridPropertyCheckStep";
import {
    hydrostaticGridMatrixCoordinates,
    isGridPropertyValueWithinThreshold,
    resolveHydrostaticTimeSteps,
    type HydrostaticEquilibriumCheckParams,
} from "@framework/internal/QC/checks/hydrostaticEquilibriumShared";
import { HydrostaticEquilibriumVectorCheckStep } from "@framework/internal/QC/checks/HydrostaticEquilibriumVectorCheckStep";
import type { QcCheckRealizationResult, QcCheckStepRunContext } from "@framework/internal/QC/QcCheckStep";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { Template } from "@framework/TemplateRegistry";

const ENSEMBLE = new RegularEnsemble(
    "DROGON",
    ["DROGON"],
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case",
    "ens1",
    "sc",
    [0, 1, 2],
    [],
    null,
    null,
    "",
);

const GRID_NAME = "Geogrid";

function makeGridInfo(gridName: string, properties: [string, string | null][]): Grid3dInfo_api {
    return {
        grid_name: gridName,
        property_info_arr: properties.map(([property_name, iso_date_or_interval]) => ({
            property_name,
            iso_date_or_interval,
        })),
    } as Grid3dInfo_api;
}

const GRID_INFO = makeGridInfo(GRID_NAME, [
    ["PRESSURE", "2018-07-01"],
    ["PRESSURE", "2018-01-01"],
    ["PRESSURE", "2019-01-01"],
    ["SWAT", "2018-01-01"],
    ["SWAT", "2018-07-01"],
    ["PORO", null],
    ["PRESSURE", "2018-01-01/2019-01-01"],
]);

type FakeQueryOptions = { queryKey: [{ _id: string }] };
type FakeResponses = Record<string, unknown | ((options: FakeQueryOptions) => unknown)>;

type StepContextOptions = {
    realizations: number[];
    responses: FakeResponses;
    matrixCoordinate?: { key: string; label: string } | null;
};

// Resolves each fetch by the generated query's id, and records the ids that were fetched
function makeContext<TMetrics>(options: StepContextOptions) {
    const results = new Map<number, QcCheckRealizationResult<TMetrics>>();
    const fetchedQueryKeys: [{ _id: string; query?: Record<string, unknown> }][] = [];

    const context = {
        ensemble: ENSEMBLE,
        realizations: [...options.realizations],
        params: { gridNames: [GRID_NAME] },
        matrixCoordinate: options.matrixCoordinate ?? { key: GRID_NAME, label: GRID_NAME },
        fetchQuery: async (fetchOptions: FakeQueryOptions) => {
            fetchedQueryKeys.push(fetchOptions.queryKey);
            const response = options.responses[fetchOptions.queryKey[0]._id];
            if (response === undefined) {
                throw new Error(`Unexpected query ${fetchOptions.queryKey[0]._id}`);
            }
            return typeof response === "function" ? response(fetchOptions) : response;
        },
        onFetchCancelOrFinish: () => {},
        setProgressMessage: () => {},
        reportRealizationResult: (realization: number, result: QcCheckRealizationResult<TMetrics>) => {
            results.set(realization, result);
        },
        previousStepResults: null,
    } as unknown as QcCheckStepRunContext<TMetrics, HydrostaticEquilibriumCheckParams>;

    return { context, results, fetchedQueryKeys };
}

// The seeded data provider manager state, which the templates serialize as a JSON string
function parseProviderState(template: Template, settingsKey: string) {
    const settings = template.moduleInstances[0].initialState?.settings as Record<string, string> | undefined;
    return JSON.parse(settings?.[settingsKey] ?? "null");
}

function makeTimeSteps(overrides?: { time_gap_ok?: boolean; time_gap_days?: number }) {
    return { t0_iso: "2018-01-01", t1_iso: "2018-07-01", time_gap_days: 181, time_gap_ok: true, ...overrides };
}

describe("HydrostaticEquilibriumCheck tests", () => {
    beforeEach(() => {
        EnsembleFingerprintStore.setAll(new Map([[ENSEMBLE.getIdent().toString(), "fingerprint"]]));
    });

    describe("vector step", () => {
        function makeVectorResult(overrides?: Partial<HydrostaticVectorCheckResult_api>) {
            return {
                time_steps: makeTimeSteps(),
                checked_vector_names: ["FOPT", "FWIT"],
                realization_results: [
                    {
                        realization: 0,
                        vector_values: [
                            { vector_name: "FOPT", value_at_t1: 0, is_zero: true },
                            { vector_name: "FWIT", value_at_t1: 0, is_zero: true },
                        ],
                    },
                    {
                        realization: 1,
                        vector_values: [
                            { vector_name: "FOPT", value_at_t1: 12.5, is_zero: false },
                            { vector_name: "FWIT", value_at_t1: 0, is_zero: true },
                        ],
                    },
                ],
                ...overrides,
            } satisfies HydrostaticVectorCheckResult_api;
        }

        test("should report success, failure naming the vector, and exception for a realization without a result", async () => {
            const { context, results, fetchedQueryKeys } = makeContext<any>({
                realizations: [0, 1, 2],
                responses: {
                    getGridModelsInfo: [GRID_INFO],
                    getHydrostaticEquilibriumVectorCheckHybrid: makeVectorResult(),
                },
            });

            await HydrostaticEquilibriumVectorCheckStep.run(context);

            expect(results.get(0)?.kind).toBe("success");
            const failure = results.get(1);
            expect(failure?.kind).toBe("failure");
            expect(failure?.kind === "failure" && failure.reason).toContain("FOPT");
            expect(failure?.kind === "failure" && failure.reason).not.toContain("FWIT");
            expect(results.get(2)?.kind).toBe("exception");

            const vectorQuery = fetchedQueryKeys.find((key) => key[0]._id.includes("VectorCheck"))?.[0].query;
            expect(vectorQuery).toMatchObject({ t0_iso: "2018-01-01", t1_iso: "2018-07-01", realizations: [0, 1, 2] });
        });

        test("should report a vector without a value at t1 as a failure", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0],
                responses: {
                    getGridModelsInfo: [GRID_INFO],
                    getHydrostaticEquilibriumVectorCheckHybrid: makeVectorResult({
                        realization_results: [
                            {
                                realization: 0,
                                vector_values: [{ vector_name: "FOPT", value_at_t1: null, is_zero: false }],
                            },
                        ],
                    }),
                },
            });

            await HydrostaticEquilibriumVectorCheckStep.run(context);

            const result = results.get(0);
            expect(result?.kind).toBe("failure");
            expect(result?.kind === "failure" && result.reason).toContain("FOPT has no value at t1");
        });

        test("should carry time_gap_ok in the metrics without forcing a failure", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0, 1],
                responses: {
                    getGridModelsInfo: [GRID_INFO],
                    getHydrostaticEquilibriumVectorCheckHybrid: makeVectorResult({
                        time_steps: makeTimeSteps({ time_gap_ok: false, time_gap_days: 3 }),
                    }),
                },
            });

            await HydrostaticEquilibriumVectorCheckStep.run(context);

            const success = results.get(0);
            expect(success?.kind).toBe("success");
            expect(success?.kind === "success" && success.metrics.timeSteps.time_gap_ok).toBe(false);
            const failure = results.get(1);
            expect(failure?.kind).toBe("failure");
            expect(failure?.kind === "failure" && failure.metrics.timeSteps.time_gap_ok).toBe(false);
        });

        test("should report an exception for all realizations when the grid has too few time steps", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0, 1],
                responses: { getGridModelsInfo: [makeGridInfo(GRID_NAME, [["PRESSURE", "2018-01-01"]])] },
            });

            await HydrostaticEquilibriumVectorCheckStep.run(context);

            expect(results.get(0)?.kind).toBe("exception");
            expect(results.get(1)?.kind).toBe("exception");
        });
    });

    describe("grid property step", () => {
        function makeGridResult(maxRelChange: number): HydrostaticGridCheckRealizationResult_api {
            return {
                time_steps: makeTimeSteps(),
                grid_name: GRID_NAME,
                checked_property_names: ["PRESSURE", "SWAT"],
                realization_result: {
                    realization: 0,
                    property_values: [
                        { property_name: "PRESSURE", max_abs_change: 1, max_rel_change: maxRelChange },
                        { property_name: "SWAT", max_abs_change: 0, max_rel_change: 0 },
                    ],
                },
            } as HydrostaticGridCheckRealizationResult_api;
        }

        test("should fail a realization with a property above the threshold, naming the property", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0, 1],
                responses: {
                    getHydrostaticEquilibriumGridPropertyCheckHybrid: (options: FakeQueryOptions) =>
                        (options.queryKey[0] as { query?: { realization?: number } }).query?.realization === 0
                            ? makeGridResult(0.5)
                            : makeGridResult(1e-6),
                },
            });

            await HydrostaticEquilibriumGridPropertyCheckStep.run(context);

            const failure = results.get(0);
            expect(failure?.kind).toBe("failure");
            expect(failure?.kind === "failure" && failure.reason).toContain("PRESSURE");
            expect(failure?.kind === "failure" && failure.reason).not.toContain("SWAT");
            expect(results.get(1)?.kind).toBe("success");
        });

        test("should request the coordinate's grid for each realization", async () => {
            const { context, fetchedQueryKeys } = makeContext<any>({
                realizations: [0, 2],
                responses: { getHydrostaticEquilibriumGridPropertyCheckHybrid: makeGridResult(0) },
            });

            await HydrostaticEquilibriumGridPropertyCheckStep.run(context);

            const queries = fetchedQueryKeys.map((key) => key[0].query);
            expect(queries).toEqual([
                expect.objectContaining({ grid_name: GRID_NAME, realization: 0 }),
                expect.objectContaining({ grid_name: GRID_NAME, realization: 2 }),
            ]);
        });

        test("should seed the templates with the first failing realization, grid, property and time steps", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0, 1, 2],
                responses: {
                    getHydrostaticEquilibriumGridPropertyCheckHybrid: (options: FakeQueryOptions) =>
                        (options.queryKey[0] as { query?: { realization?: number } }).query?.realization === 0
                            ? makeGridResult(1e-6)
                            : makeGridResult(0.5),
                },
            });
            await HydrostaticEquilibriumGridPropertyCheckStep.run(context);

            const templates = HydrostaticEquilibriumGridPropertyCheckStep.templates!({
                realizations: [0, 1, 2],
                results,
            });
            expect(templates).toHaveLength(2);

            const viewerState = parseProviderState(templates[0], "dataProviderData");
            expect(viewerState.children[0].children[0].settings).toEqual({
                ensemble: ENSEMBLE.getIdent().toString(),
                realization: "1",
                gridName: JSON.stringify(GRID_NAME),
                attribute: JSON.stringify("PRESSURE"),
                timeType: JSON.stringify("computedInterval"),
                timePointPair: JSON.stringify(["2018-01-01T00:00:00", "2018-07-01T00:00:00"]),
            });

            const intersectionState = parseProviderState(templates[1], "dataProviderSerializedState");
            const [t0Provider, t1Provider] = intersectionState.children.map(
                (view: { children: { settings: Record<string, string> }[] }) => view.children[0].settings,
            );
            expect(t0Provider).toMatchObject({ realization: "1", timeType: '"timePoint"' });
            expect(t0Provider.timePoint).toBe(JSON.stringify("2018-01-01T00:00:00"));
            expect(t1Provider.timePoint).toBe(JSON.stringify("2018-07-01T00:00:00"));
        });

        test("should leave the realization unset in the templates when no realization failed", async () => {
            const { context, results } = makeContext<any>({
                realizations: [0],
                responses: { getHydrostaticEquilibriumGridPropertyCheckHybrid: makeGridResult(0) },
            });
            await HydrostaticEquilibriumGridPropertyCheckStep.run(context);

            const templates = HydrostaticEquilibriumGridPropertyCheckStep.templates!({ realizations: [0], results });
            const viewerState = parseProviderState(templates[0], "dataProviderData");
            expect(viewerState.children[0].children[0].settings).not.toHaveProperty("realization");
        });
    });

    describe("shared helpers", () => {
        test("hydrostaticGridMatrixCoordinates should map each grid name to one coordinate", () => {
            expect(hydrostaticGridMatrixCoordinates({ gridNames: ["A", "B"] })).toEqual([
                { key: "A", label: "A" },
                { key: "B", label: "B" },
            ]);
            expect(hydrostaticGridMatrixCoordinates({ gridNames: [] })).toEqual([]);
        });

        test("resolveHydrostaticTimeSteps should pick the two earliest distinct time steps of the hydrostatic properties", () => {
            expect(resolveHydrostaticTimeSteps(GRID_INFO)).toEqual({ t0Iso: "2018-01-01", t1Iso: "2018-07-01" });
        });

        test("resolveHydrostaticTimeSteps should ignore other properties, intervals and static values", () => {
            const gridInfo = makeGridInfo(GRID_NAME, [
                ["PORO", "2017-01-01"],
                ["PORO", "2017-02-01"],
                ["PRESSURE", null],
                ["PRESSURE", "2018-01-01/2019-01-01"],
                ["PRESSURE", "2018-01-01"],
            ]);
            expect(resolveHydrostaticTimeSteps(gridInfo)).toBeNull();
        });

        test("isGridPropertyValueWithinThreshold should accept a relative change up to 1e-3", () => {
            const value = { property_name: "PRESSURE", max_abs_change: 1 };
            expect(isGridPropertyValueWithinThreshold({ ...value, max_rel_change: 1e-3 })).toBe(true);
            expect(isGridPropertyValueWithinThreshold({ ...value, max_rel_change: 1.1e-3 })).toBe(false);
        });
    });
});
