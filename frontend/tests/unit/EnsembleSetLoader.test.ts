import type { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { EnsembleDetails_api, EnsembleParameter_api, EnsembleParametersAndSensitivities_api } from "@api";
import { ParameterType } from "@framework/EnsembleParameters";
import { loadMetadataFromBackendAndCreateEnsembleSet } from "@framework/internal/EnsembleSetLoader";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

const CASE_UUID = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
const PARENT_CASE_UUID = "22222222-bbbb-4444-bbbb-bbbbbbbbbbbb";

function makeEnsembleDetails(overrides: Partial<EnsembleDetails_api> = {}): EnsembleDetails_api {
    return {
        name: "pred",
        fieldIdentifiers: ["DROGON"],
        caseName: "case1",
        caseUuid: CASE_UUID,
        realizations: [0, 1],
        stratigraphicColumnIdentifier: "strat",
        assetName: "DROGON",
        fipRegions: [],
        restartFromChain: [],
        restartFromUnresolvedUuid: null,
        ...overrides,
    } as EnsembleDetails_api;
}

function makeApiParameter(overrides: Partial<EnsembleParameter_api>): EnsembleParameter_api {
    return {
        name: "PARAM",
        isLogarithmic: false,
        isDiscrete: false,
        isConstant: false,
        isNumerical: true,
        groupName: "GLOBVAR",
        descriptiveName: null,
        realizations: [0, 1],
        values: [1.0, 2.0],
        ...overrides,
    } as EnsembleParameter_api;
}

function makeFakeQueryClient(
    ensembleDetails: EnsembleDetails_api,
    parametersAndSensitivities: EnsembleParametersAndSensitivities_api,
): QueryClient {
    const fetchQuery = vi.fn(async (options: { queryKey: [{ _id: string; body?: unknown[] }] }) => {
        const key = options.queryKey[0];
        switch (key._id) {
            case "postRefreshFingerprintsForEnsembles":
                return (key.body ?? []).map(() => null);
            case "getEnsembleDetails":
                return ensembleDetails;
            case "getParametersAndSensitivities":
                return parametersAndSensitivities;
            default:
                throw new Error(`Unexpected query: ${key._id}`);
        }
    });
    return { fetchQuery } as unknown as QueryClient;
}

describe("EnsembleSetLoader", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", { getItem: vi.fn(() => null) });
        vi.spyOn(console, "debug").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const ensembleIdent = new RegularEnsembleIdent(CASE_UUID, "pred");
    const userEnsembleSettings = [{ ensembleIdent, customName: null, caseName: "case1", color: "red" }];

    test("sets sourceEnsembleIdent on parameters inherited from a restart ensemble", async () => {
        const queryClient = makeFakeQueryClient(makeEnsembleDetails(), {
            parameters: [
                makeApiParameter({ name: "OWN", sourceEnsemble: null }),
                makeApiParameter({
                    name: "INHERITED",
                    isDiscrete: true,
                    values: ["a", "b"],
                    sourceEnsemble: { caseUuid: PARENT_CASE_UUID, caseName: "parentCase", ensembleName: "iter-3" },
                }),
            ],
            sensitivities: [],
            warnings: [],
        });

        const { ensembleSet, ensembleLoadingWarningInfoMap } = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            [],
        );

        const parameters = ensembleSet.getEnsemble(ensembleIdent).getParameters().getParameterArr();
        const ownParameter = parameters.find((p) => p.name === "OWN");
        const inheritedParameter = parameters.find((p) => p.name === "INHERITED");

        expect(ownParameter?.type).toBe(ParameterType.CONTINUOUS);
        expect(ownParameter?.sourceEnsembleIdent).toBeUndefined();
        expect(inheritedParameter?.type).toBe(ParameterType.DISCRETE);
        expect(
            inheritedParameter?.sourceEnsembleIdent?.equals(new RegularEnsembleIdent(PARENT_CASE_UUID, "iter-3")),
        ).toBe(true);
        expect(ensembleLoadingWarningInfoMap).toEqual({});
    });

    test("passes the restart chain from ensemble details to the regular ensemble", async () => {
        const queryClient = makeFakeQueryClient(
            makeEnsembleDetails({
                restartFromChain: [
                    { caseUuid: CASE_UUID, caseName: "case1", ensembleName: "iter-3" },
                    { caseUuid: PARENT_CASE_UUID, caseName: "parentCase", ensembleName: "iter-0" },
                ],
            }),
            { parameters: [makeApiParameter({})], sensitivities: [], warnings: [] },
        );

        const { ensembleSet } = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            [],
        );

        const ensemble = ensembleSet.getEnsemble(ensembleIdent);
        expect(ensemble.isRestartEnsemble()).toBe(true);
        expect(ensemble.getRestartFromChain().map((ident) => ident.toString())).toEqual([
            new RegularEnsembleIdent(CASE_UUID, "iter-3").toString(),
            new RegularEnsembleIdent(PARENT_CASE_UUID, "iter-0").toString(),
        ]);
    });

    test("collects every backend warning for an ensemble in the warning map", async () => {
        const warnings = ["Parameters missing from the standard result.", "Restart ensemble could not be found."];
        const queryClient = makeFakeQueryClient(makeEnsembleDetails(), {
            parameters: [makeApiParameter({})],
            sensitivities: [],
            warnings,
        });

        const { ensembleSet, ensembleLoadingWarningInfoMap } = await loadMetadataFromBackendAndCreateEnsembleSet(
            queryClient,
            userEnsembleSettings,
            [],
        );

        expect(ensembleSet.hasEnsemble(ensembleIdent)).toBe(true);
        expect(ensembleLoadingWarningInfoMap[ensembleIdent.toString()]?.warningMessages).toEqual(warnings);
    });
});
