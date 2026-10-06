import type * as bbox from "@lib/utils/bbox";

import type { GroupType } from "../groups/groupTypes";
import type { DataProviderAccessors } from "../interfacesAndTypes/customDataProviderImplementation";
import type { StoredData } from "../interfacesAndTypes/sharedTypes";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

import type { HoverVisualizationFunctions } from "./mergeHoverVisualizationFunctions";
import type {
    Annotation,
    CustomGroupPropsMap,
    DataProviderVisualizationTargetTypes,
    VisualizationTarget,
} from "./VisualizationAssembler";

export type TransformerArgs<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = DataProviderAccessors<TSettings, TData, TStoredData> & {
    id: string;
    name: string;
    isLoading: boolean;
    getInjectedData: () => TInjectedData;
    getDataValueRange: () => Readonly<[number, number]> | null;
    /**
     * Returns the value computed for `key` the last time, as long as all `deps` are the same (compared by reference),
     * and computes it anew otherwise. Keeps derived data reference-stable when only settings that affect the
     * presentation change, e.g. `memoize("geoJson", [getData()], () => toGeoJson(getData()))`.
     * The values are kept per provider and shared between all of its transformers.
     */
    memoize: <T>(key: string, deps: readonly unknown[], compute: () => T) => T;
};

export type VisualizationTransformer<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (
    args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>,
) => DataProviderVisualizationTargetTypes[TTarget] | null;

// This does likely require a refactor as soon as we have tested against a use case
export type HoverVisualizationTransformer<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>) => HoverVisualizationFunctions<TTarget>;

export type BoundingBoxTransformer<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>) => bbox.BBox | null;

export type AnnotationsTransformer<
    TSettings extends Settings,
    TData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>) => Annotation[];

export type ReduceAccumulatedDataFunction<
    TSettings extends Settings,
    TData,
    TAccumulatedData,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
> = (
    accumulatedData: TAccumulatedData,
    args: TransformerArgs<TSettings, TData, TStoredData, TInjectedData>,
) => TAccumulatedData;

export type DataProviderTransformers<
    TSettings extends Settings,
    TData,
    TTarget extends VisualizationTarget,
    TStoredData extends StoredData = Record<string, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> = {
    transformToVisualization: VisualizationTransformer<TSettings, TData, TTarget, TStoredData, TInjectedData>;
    transformToBoundingBox?: BoundingBoxTransformer<TSettings, TData, TStoredData, TInjectedData>;
    transformToAnnotations?: AnnotationsTransformer<TSettings, TData, TStoredData, TInjectedData>;
    transformToHoverVisualization?: HoverVisualizationTransformer<
        TSettings,
        TData,
        TTarget,
        TStoredData,
        TInjectedData
    >;
    reduceAccumulatedData?: ReduceAccumulatedDataFunction<
        TSettings,
        TData,
        TAccumulatedData,
        TStoredData,
        TInjectedData
    >;
};

export type GroupPropsCollectorArgs<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> = {
    id: string;
    name: string;
    getSetting: <TKey extends TSettingKey>(setting: TKey) => SettingTypeDefinitions[TKey]["externalValue"];
};

export interface GroupCustomPropsCollector<
    TSettings extends Settings,
    TGroupKey extends keyof TCustomGroupProps,
    TCustomGroupProps extends CustomGroupPropsMap = Record<string, never>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    (args: GroupPropsCollectorArgs<TSettings, TSettingKey>): TCustomGroupProps[TGroupKey];
}

/*
 * Holds the transformers registered for each data provider type, and the custom props collectors registered for each
 * group type.
 */
export class TransformerRegistry<
    TTarget extends VisualizationTarget,
    TCustomGroupProps extends CustomGroupPropsMap = Record<GroupType, never>,
    TInjectedData extends Record<string, any> = Record<string, never>,
    TAccumulatedData extends Record<string, any> = Record<string, never>,
> {
    private _dataProviderTransformers: Map<
        string,
        DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData>
    > = new Map();

    private _groupCustomPropsCollectors: Map<
        keyof TCustomGroupProps,
        GroupCustomPropsCollector<any, any, TCustomGroupProps>
    > = new Map();

    registerDataProviderTransformers(
        dataProviderName: string,
        transformers: DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData>,
    ): void {
        if (this._dataProviderTransformers.has(dataProviderName)) {
            throw new Error(`Transformer function for data provider ${dataProviderName} already registered`);
        }
        this._dataProviderTransformers.set(dataProviderName, transformers);
    }

    registerGroupCustomPropsCollector(
        groupName: keyof TCustomGroupProps,
        collector: GroupCustomPropsCollector<any, any, TCustomGroupProps>,
    ): void {
        if (this._groupCustomPropsCollectors.has(groupName)) {
            throw new Error(`Data collector function for group ${String(groupName)} already registered`);
        }
        this._groupCustomPropsCollectors.set(groupName, collector);
    }

    getDataProviderTransformers(
        dataProviderType: string,
    ): DataProviderTransformers<any, any, TTarget, any, TInjectedData, TAccumulatedData> {
        const transformers = this._dataProviderTransformers.get(dataProviderType);
        if (!transformers) {
            throw new Error(`No visualization transformer found for data provider ${dataProviderType}`);
        }
        return transformers;
    }

    getGroupCustomPropsCollector(
        groupType: keyof TCustomGroupProps,
    ): GroupCustomPropsCollector<any, any, TCustomGroupProps> | null {
        return this._groupCustomPropsCollectors.get(groupType) ?? null;
    }
}
