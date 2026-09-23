import type { createStore } from "jotai";

import type { Module } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import type { Interfaces } from "@modules/EconomicScreening/interfaces";
import type { SerializedState } from "@modules/EconomicScreening/persistence";
import { MODULE_NAME } from "@modules/EconomicScreening/registerModule";
import {
    displayedRealizationAtom,
    activeVectorListQueryAtom,
} from "@modules/EconomicScreening/settings/atoms/derivedAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "@modules/EconomicScreening/settings/atoms/persistableFixableAtoms";
import { validRealizationNumbersAtom } from "@modules/EconomicScreening/settings/atoms/sourceQueryAtoms";
import { sourceHorizonAtom } from "@modules/EconomicScreening/settings/atoms/sourceSnapshotAtoms";
import { economicScreeningResultsAtom } from "@modules/EconomicScreening/view/atoms/derivedAtoms";

type Store = ReturnType<typeof createStore>;

export type EconomicScreeningInstance = ModuleInstance<Interfaces, SerializedState>;

/**
 * Creates a module instance through the framework registry and the module's own `loadModule`
 * registration. Test files must mock the React `View` and `Settings` components, which import plotly.
 */
export async function createEconomicScreeningInstance(
    store: Store,
    id = `economic-screening-${Math.random().toString(36).slice(2)}`,
): Promise<{ module: Module<Interfaces, SerializedState>; instance: EconomicScreeningInstance }> {
    await import("@modules/EconomicScreening/loadModule");
    const module = ModuleRegistry.getModule(MODULE_NAME) as Module<Interfaces, SerializedState>;
    const instance = module.makeInstance(id, store);
    for (let attempt = 0; attempt < 50 && !instance.isInitialized(); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (!instance.isInitialized()) {
        throw new Error("Module instance was not initialized.");
    }
    return { module, instance };
}

/** Subscribes what the Settings component reads, as mounting it would. */
export function mountSettings(store: Store): () => void {
    const unsubscribers = [
        store.sub(selectedEnsembleIdentAtom, () => {}),
        store.sub(activeVectorListQueryAtom, () => {}),
        store.sub(sourceHorizonAtom, () => {}),
        store.sub(selectedRealizationAtom, () => {}),
        store.sub(displayedRealizationAtom, () => {}),
        store.sub(validRealizationNumbersAtom, () => {}),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/**
 * Applies the settings-to-view interface effects, as the framework's `ApplyInterfaceEffectsToView`
 * does for a mounted view, and subscribes the view's calculated results.
 */
export function mountView(store: Store, instance: EconomicScreeningInstance): () => void {
    const unsubscribers = [
        store.sub(instance.getSettingsToViewInterfaceEffectsAtom(), () => {}),
        store.sub(economicScreeningResultsAtom, () => {}),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
