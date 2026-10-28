import { CancelledError, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleQcSet } from "@framework/internal/QC/EnsembleQcSet";
import { QcCheckRegistry } from "@framework/internal/QC/QcCheckRegistry";
import { RegularEnsemble } from "@framework/RegularEnsemble";

import { getCheckRuntime, getQcEnsembleIdentStrings, makeBlockingCheck } from "../utils/qc";

const BLOCKING_CHECK_ID = "test-blocking-check";

const fetchErrors: unknown[] = [];

function makeEnsemble(caseUuid: string, ensembleName: string): RegularEnsemble {
    return new RegularEnsemble(
        "DROGON",
        ["DROGON"],
        caseUuid,
        "case",
        ensembleName,
        "sc",
        [0, 1, 2],
        [],
        null,
        null,
        "",
    );
}

describe("EnsembleQcSet tests", () => {
    const ENSEMBLE_A = makeEnsemble("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");
    const ENSEMBLE_B = makeEnsemble("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");

    let queryClient: QueryClient;

    beforeAll(() => {
        QcCheckRegistry.registerCheck(BLOCKING_CHECK_ID, makeBlockingCheck(fetchErrors));
    });

    beforeEach(() => {
        queryClient = new QueryClient();
        fetchErrors.length = 0;
    });

    afterEach(() => {
        queryClient.clear();
    });

    test("should create one QC per regular ensemble, with a runtime per registered check", () => {
        const qcSet = new EnsembleQcSet();
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B]), queryClient);

        expect(getQcEnsembleIdentStrings(qcSet)).toEqual([
            ENSEMBLE_A.getIdent().toString(),
            ENSEMBLE_B.getIdent().toString(),
        ]);
        for (const ensembleQc of qcSet.getEnsembleQcsArray()) {
            expect(Array.from(ensembleQc.getCheckRuntimes().keys())).toEqual([BLOCKING_CHECK_ID]);
        }
    });

    test("should not create QCs for delta ensembles", () => {
        const qcSet = new EnsembleQcSet();
        const deltaEnsemble = new DeltaEnsemble(ENSEMBLE_A, ENSEMBLE_B, "", null);
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B], [deltaEnsemble]), queryClient);

        expect(getQcEnsembleIdentStrings(qcSet)).toEqual([
            ENSEMBLE_A.getIdent().toString(),
            ENSEMBLE_B.getIdent().toString(),
        ]);
    });

    test("should keep the existing QC for ensembles still in the set", () => {
        const qcSet = new EnsembleQcSet();
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A]), queryClient);
        const ensembleQcA = qcSet.getEnsembleQcsArray()[0];

        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B]), queryClient);

        expect(qcSet.getEnsembleQcsArray()[0]).toBe(ensembleQcA);
        expect(getQcEnsembleIdentStrings(qcSet)).toEqual([
            ENSEMBLE_A.getIdent().toString(),
            ENSEMBLE_B.getIdent().toString(),
        ]);
    });

    test("should give retained QCs and their check runtimes the rebuilt ensemble instance", async () => {
        const qcSet = new EnsembleQcSet();
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A]), queryClient);
        const ensembleQcA = qcSet.getEnsembleQcsArray()[0];
        const checkRuntimeA = getCheckRuntime(qcSet, ENSEMBLE_A, BLOCKING_CHECK_ID);
        const run = checkRuntimeA.run([0, 1, 2]);

        // Same ident, as rebuilt by the ensemble set loader whenever the ensemble selection is applied
        const rebuiltEnsembleA = makeEnsemble("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([rebuiltEnsembleA]), queryClient);

        expect(qcSet.getEnsembleQcsArray()[0]).toBe(ensembleQcA);
        expect(ensembleQcA.getEnsemble()).toBe(rebuiltEnsembleA);
        expect(checkRuntimeA.getEnsemble()).toBe(rebuiltEnsembleA);
        // The check is kept running rather than being replaced
        expect(checkRuntimeA.isRunning()).toBe(true);

        checkRuntimeA.cancel();
        await run;
    });

    test("should cancel running checks of removed ensembles and drop their QCs", async () => {
        const qcSet = new EnsembleQcSet();
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B]), queryClient);
        const checkRuntimeA = getCheckRuntime(qcSet, ENSEMBLE_A, BLOCKING_CHECK_ID);
        const checkRuntimeB = getCheckRuntime(qcSet, ENSEMBLE_B, BLOCKING_CHECK_ID);
        const runA = checkRuntimeA.run([0, 1, 2]);
        const runB = checkRuntimeB.run([0, 1, 2]);

        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_B]), queryClient);

        expect(getQcEnsembleIdentStrings(qcSet)).toEqual([ENSEMBLE_B.getIdent().toString()]);
        expect(checkRuntimeA.isRunning()).toBe(false);
        // The remaining ensemble's check is left alone
        expect(checkRuntimeB.isRunning()).toBe(true);

        await runA;
        expect(fetchErrors).toEqual([expect.any(CancelledError)]);

        checkRuntimeB.cancel();
        await runB;
    });

    test("should cancel all running checks and remove all QCs on clear", async () => {
        const qcSet = new EnsembleQcSet();
        qcSet.synchronizeWithEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B]), queryClient);
        const checkRuntimeA = getCheckRuntime(qcSet, ENSEMBLE_A, BLOCKING_CHECK_ID);
        const checkRuntimeB = getCheckRuntime(qcSet, ENSEMBLE_B, BLOCKING_CHECK_ID);
        const runs = [checkRuntimeA.run([0, 1, 2]), checkRuntimeB.run([0, 1, 2])];

        qcSet.clear();

        expect(qcSet.getEnsembleQcsArray()).toEqual([]);
        expect(checkRuntimeA.isRunning()).toBe(false);
        expect(checkRuntimeB.isRunning()).toBe(false);

        await Promise.all(runs);
        expect(fetchErrors).toEqual([expect.any(CancelledError), expect.any(CancelledError)]);
    });
});
