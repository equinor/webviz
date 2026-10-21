import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import {
    deltaEnsembleProvider,
    ensembleProvider,
    findItem,
    findProvider,
    getProviderSetting,
    makeDataProviderManager,
    managerState,
    resetTestBackend,
    settle,
    sharedSetting,
} from "../../utils/dataProviderFramework";

function makeRegularEnsemble(caseUuid: string, realizations: number[]): RegularEnsemble {
    return new RegularEnsemble(
        "asset",
        ["field-a"],
        caseUuid,
        `case-${caseUuid}`,
        "iter-0",
        "strat-column",
        realizations,
        [],
        null,
        null,
        "#ff0000",
    );
}

const comparison = makeRegularEnsemble("11111111-1111-4111-8111-111111111111", [0, 1, 2]);
const reference = makeRegularEnsemble("22222222-2222-4222-8222-222222222222", [1, 2, 3]);
const delta = new DeltaEnsemble(comparison, reference, "#00ff00");
const ensembleSet = new EnsembleSet([comparison, reference], [delta]);

beforeEach(() => {
    vi.useFakeTimers();
    resetTestBackend();
});

afterEach(() => {
    vi.useRealTimers();
});

async function restore(...items: Parameters<typeof managerState>[0]) {
    const manager = makeDataProviderManager({
        fieldId: "field-a",
        ensembles: ensembleSet.getRegularEnsembleArray(),
        deltaEnsembles: ensembleSet.getDeltaEnsembleArray(),
        realizationFilterFunction: (ident) => ensembleSet.getEnsemble(ident).getRealizations(),
    });
    manager.deserializeState(managerState(items));
    await settle(manager);
    return manager;
}

function identStrings(constraints: readonly { toString(): string }[] | null): string[] | undefined {
    return constraints?.map((ident) => ident.toString());
}

const REGULAR_IDENT_STRINGS = [comparison.getIdent().toString(), reference.getIdent().toString()];
const ALL_IDENT_STRINGS = [...REGULAR_IDENT_STRINGS, delta.getIdent().toString()];

describe("Ensemble setting with delta ensembles", () => {
    test("a delta-capable provider offers the delta ensemble, and its realizations are the intersection of both ensembles", async () => {
        const manager = await restore(deltaEnsembleProvider("Delta capable", { ensemble: delta.getIdent() }));
        const provider = findProvider(manager, "Delta capable");

        expect(identStrings(getProviderSetting(provider, Setting.ENSEMBLE).getValueConstraints())).toEqual(
            ALL_IDENT_STRINGS,
        );
        expect(getProviderSetting(provider, Setting.ENSEMBLE).getValue()?.toString()).toBe(delta.getIdent().toString());
        expect(getProviderSetting(provider, Setting.REALIZATION).getValueConstraints()).toEqual([1, 2]);
    });

    test("a provider without delta support offers regular ensembles only", async () => {
        const manager = await restore(ensembleProvider("Regular only"));
        const provider = findProvider(manager, "Regular only");

        expect(identStrings(getProviderSetting(provider, Setting.ENSEMBLE).getValueConstraints())).toEqual(
            REGULAR_IDENT_STRINGS,
        );
    });

    test("a shared setting over a delta-capable and a regular-only provider offers regular ensembles only", async () => {
        const manager = await restore(
            sharedSetting("Shared ensemble", Setting.ENSEMBLE),
            deltaEnsembleProvider("Delta capable"),
            ensembleProvider("Regular only"),
        );
        const shared = findItem<SharedSetting<Setting.ENSEMBLE>>(manager, "Shared ensemble");

        expect(identStrings(shared.getWrappedSetting().getValueConstraints())).toEqual(REGULAR_IDENT_STRINGS);
    });

    test("a shared setting over two delta-capable providers offers the delta ensemble, and passes it on", async () => {
        const manager = await restore(
            sharedSetting("Shared ensemble", Setting.ENSEMBLE),
            deltaEnsembleProvider("First", { ensemble: comparison.getIdent() }),
            deltaEnsembleProvider("Second"),
        );
        const shared = findItem<SharedSetting<Setting.ENSEMBLE>>(manager, "Shared ensemble");

        expect(identStrings(shared.getWrappedSetting().getValueConstraints())).toEqual(ALL_IDENT_STRINGS);

        shared.getWrappedSetting().setValue(delta.getIdent());
        await settle(manager);

        for (const name of ["First", "Second"]) {
            const provider = findProvider(manager, name);
            expect(getProviderSetting(provider, Setting.ENSEMBLE).getValue()?.toString()).toBe(
                delta.getIdent().toString(),
            );
            expect(getProviderSetting(provider, Setting.REALIZATION).getValueConstraints()).toEqual([1, 2]);
        }
    });
});
