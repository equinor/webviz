import { CancelledError, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { QcCheckRegistry } from "@framework/internal/QC/QcCheckRegistry";
import { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";

import { getCheckRuntime, getQcEnsembleIdentStrings, makeBlockingCheck } from "../utils/qc";

// The session's settings read color palettes from `localStorage` (absent in the node test environment) on construction
vi.stubGlobal("localStorage", { getItem: () => null });

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

describe("PrivateWorkbenchSession QC set tests", () => {
    const ENSEMBLE_A = makeEnsemble("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");
    const ENSEMBLE_B = makeEnsemble("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");

    let queryClient: QueryClient;
    let session: PrivateWorkbenchSession;

    beforeAll(() => {
        QcCheckRegistry.registerCheck(BLOCKING_CHECK_ID, makeBlockingCheck(fetchErrors));
    });

    beforeEach(() => {
        queryClient = new QueryClient();
        session = PrivateWorkbenchSession.createEmpty(queryClient);
        fetchErrors.length = 0;
    });

    afterEach(() => {
        session.beforeDestroy();
        queryClient.clear();
    });

    test("should keep the QC set in sync with the ensemble set", () => {
        session.setEnsembleSet(new EnsembleSet([ENSEMBLE_A, ENSEMBLE_B]));
        expect(getQcEnsembleIdentStrings(session.getEnsembleQcSet())).toEqual([
            ENSEMBLE_A.getIdent().toString(),
            ENSEMBLE_B.getIdent().toString(),
        ]);

        session.setEnsembleSet(new EnsembleSet([ENSEMBLE_B]));
        expect(getQcEnsembleIdentStrings(session.getEnsembleQcSet())).toEqual([ENSEMBLE_B.getIdent().toString()]);
    });

    test("should notify QC set subscribers with a new snapshot when the ensemble set changes", () => {
        const getSnapshot = session.makeSnapshotGetter(WorkbenchSessionTopic.ENSEMBLE_QC_SET);
        const snapshotBefore = getSnapshot();
        const onChange = vi.fn();
        session.getPublishSubscribeDelegate().subscribe(WorkbenchSessionTopic.ENSEMBLE_QC_SET, onChange);

        session.setEnsembleSet(new EnsembleSet([ENSEMBLE_A]));

        expect(onChange).toHaveBeenCalled();
        // `useSyncExternalStore` only re-renders when the snapshot changes
        expect(getSnapshot()).not.toBe(snapshotBefore);
    });

    test("should cancel running checks when destroyed", async () => {
        session.setEnsembleSet(new EnsembleSet([ENSEMBLE_A]));
        const checkRuntime = getCheckRuntime(session.getEnsembleQcSet(), ENSEMBLE_A, BLOCKING_CHECK_ID);
        const run = checkRuntime.run([0, 1, 2]);

        session.beforeDestroy();

        expect(checkRuntime.isRunning()).toBe(false);
        await run;
        expect(fetchErrors).toEqual([expect.any(CancelledError)]);
    });
});
