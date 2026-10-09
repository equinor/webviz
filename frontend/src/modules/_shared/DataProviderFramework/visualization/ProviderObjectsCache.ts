import type * as bbox from "@lib/utils/bbox";

import type { DataProvider } from "../framework/DataProvider/DataProvider";

import type { HoverVisualizationFunctions } from "./mergeHoverVisualizationFunctions";
import type { Annotation, DataProviderVisualization, VisualizationTarget } from "./VisualizationAssembler";

// Everything made for a single provider that depends on nothing but the provider and the injected data - accumulated
// data is not included, as it also depends on the providers that came before
export type DataProviderObjects<TTarget extends VisualizationTarget> = {
    visualization: DataProviderVisualization<TTarget> | null;
    hoverVisualizationFunctions: HoverVisualizationFunctions<TTarget>;
    annotations: Annotation[];
    boundingBox: bbox.BBox | null;
};

/*
 * The objects last made for each provider, which stay valid until the provider changes (its revision number) or the
 * injected data does.
 * Keyed by the DataProvider instance itself (not its ID string) so that entries for destroyed data providers are
 * reclaimed by ordinary GC once nothing else references the provider, instead of living as long as the assembler
 * (which is a long-lived, module-scope singleton).
 */
export class ProviderObjectsCache<TTarget extends VisualizationTarget, TInjectedData extends Record<string, any>> {
    private _cachedObjectsMap: WeakMap<
        DataProvider<any, any, any>,
        {
            revisionNumber: number;
            injectedData: TInjectedData | undefined;
            objects: DataProviderObjects<TTarget>;
        }
    > = new WeakMap();

    get(
        dataProvider: DataProvider<any, any, any>,
        injectedData: TInjectedData | undefined,
    ): DataProviderObjects<TTarget> | null {
        const cached = this._cachedObjectsMap.get(dataProvider);
        if (
            !cached ||
            cached.revisionNumber !== dataProvider.getRevisionNumber() ||
            cached.injectedData !== injectedData
        ) {
            return null;
        }
        return cached.objects;
    }

    set(
        dataProvider: DataProvider<any, any, any>,
        injectedData: TInjectedData | undefined,
        objects: DataProviderObjects<TTarget>,
    ): void {
        this._cachedObjectsMap.set(dataProvider, {
            revisionNumber: dataProvider.getRevisionNumber(),
            injectedData,
            objects,
        });
    }
}
