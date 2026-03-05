import { isCancelledError } from "@tanstack/react-query";

import { GenericStatusMessageStore } from "@framework/GenericStatusMessageStore";
import type { PublishSubscribeStatusMessageStore, StatusWriter } from "@framework/types/statusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import type { GlobalSettings } from "../../framework/DataProviderManager/DataProviderManager";
import { SettingTopic, type SettingManager } from "../../framework/SettingManager/SettingManager";
import type { ResolverSpec, SharedResult } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { Settings } from "../../settings/settingsDefinitions";

export const NO_UPDATE = Symbol("NO_UPDATE");
export type NoUpdate = typeof NO_UPDATE;

const PENDING = Symbol("PENDING");
export type Pending = typeof PENDING;

export type Accessors<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
> = {
    localSetting: <K extends TKey>(settingName: K) => Read<TSettingTypes[K]>;
    globalSetting: <T extends keyof GlobalSettings>(settingName: T) => Read<GlobalSettings[T]>;
    sharedResult: <TDep, THandleReads extends Record<string, Read<any>> = Record<string, never>>(
        handle: SharedResult<TDep, TSettings, TSettingTypes, TKey, THandleReads>,
    ) => Read<Awaited<TDep> | null>;
};

/*
 * Dependency class is used to represent a node in the dependency graph of a data provider settings context.
 * It can be compared to an atom in Jotai.
 *
 * It can subscribe to both changes in settings (local and global) and other dependencies.
 * Its value is calculated by an update function that is provided during initialization.
 * The update function is called whenever any of the dependencies change.
 * All entities that this dependency depends on are cached such that they are only updated when they change,
 * not when they are accessed.
 * The dependency can be subscribed to, and will notify its subscribers whenever its value changes.
 */
export class Dependency<
    TReturnValue,
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
    TReads extends Record<string, Read<any>> = Record<string, never>,
> {
    private _resolverSpec: ResolverSpec<TReturnValue, TSettings, TSettingTypes, TKey, TReads>;
    private _dependencies: Set<(value: Awaited<TReturnValue> | null) => void> = new Set();
    private _loadingDependencies: Set<(loading: boolean, hasDependencies: boolean) => void> = new Set();
    private _isLoading = false;

    private _localSettingManagerGetter: <K extends TKey>(key: K) => SettingManager<K>;
    private _globalSettingGetter: <K extends keyof GlobalSettings>(key: K) => GlobalSettings[K] | null;

    private _makeLocalSettingGetter: <K extends TKey>(key: K, handler: (value: TSettingTypes[K]) => void) => void;
    private _localSettingLoadingStateGetter: <K extends TKey>(key: K) => boolean;
    private _makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
        key: K,
        handler: (value: GlobalSettings[K] | null) => void,
    ) => void;
    private _cachedSettingsMap: Map<string, any> = new Map();
    private _cachedGlobalSettingsMap: Map<string, any> = new Map();
    private _cachedDependenciesMap: Map<Dependency<any, TSettings, TSettingTypes, any, any>, any> = new Map();
    private _cachedValue: Awaited<TReturnValue> | null = null;
    private _abortController: AbortController | null = null;
    private _isInitialized = false;
    private _hasParentDependencies = false;
    private _numChildDependencies = 0;
    private _updatePromise: Promise<void> | null = null;
    private _queued = false;
    private _unsubscribers: (() => void)[] = [];
    private _isProbing = false;
    private _debugName: string;

    private _statusStore = new GenericStatusMessageStore("Dependency");

    constructor(
        localSettingManagerGetter: <K extends TKey>(key: K) => SettingManager<K>,
        globalSettingGetter: <K extends keyof GlobalSettings>(key: K) => GlobalSettings[K] | null,
        resolverSpec: ResolverSpec<TReturnValue, TSettings, TSettingTypes, TKey, TReads>,
        makeLocalSettingGetter: <K extends TKey>(key: K, handler: (value: TSettingTypes[K]) => void) => void,
        localSettingLoadingStateGetter: <K extends TKey>(key: K) => boolean,
        makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K] | null) => void,
        ) => void,
        debugName: string,
    ) {
        this._debugName = debugName;

        this._localSettingManagerGetter = localSettingManagerGetter;
        this._globalSettingGetter = globalSettingGetter;
        this._resolverSpec = resolverSpec;
        this._makeLocalSettingGetter = makeLocalSettingGetter;
        this._localSettingLoadingStateGetter = localSettingLoadingStateGetter;
        this._makeGlobalSettingGetter = makeGlobalSettingGetter;

        this.getGlobalSetting = this.getGlobalSetting.bind(this);
        this.getLocalSetting = this.getLocalSetting.bind(this);
        this.getHelperDependency = this.getHelperDependency.bind(this);
        this.getStatusWriter = this.getStatusWriter.bind(this);
    }

    beforeDestroy() {
        this._abortController?.abort();
        this._abortController = null;

        for (const unsubscribe of this._unsubscribers) {
            unsubscribe();
        }
        this._unsubscribers = [];

        this._statusStore.clear();
        this._dependencies.clear();
        this._loadingDependencies.clear();
    }

    hasChildDependencies(): boolean {
        return this._numChildDependencies > 0;
    }

    getValue(): Awaited<TReturnValue> | null {
        return this._cachedValue;
    }

    getIsLoading(): boolean {
        return this._isLoading;
    }

    subscribe(callback: (value: Awaited<TReturnValue> | null) => void, childDependency: boolean = false): () => void {
        this._dependencies.add(callback);

        if (childDependency) {
            this._numChildDependencies++;
        }

        return () => {
            this._dependencies.delete(callback);
            if (childDependency) {
                this._numChildDependencies--;
            }
        };
    }

    subscribeLoading(callback: (loading: boolean, hasDependencies: boolean) => void): () => void {
        this._loadingDependencies.add(callback);

        return () => {
            this._loadingDependencies.delete(callback);
        };
    }

    getStatusMessages() {
        return this._statusStore.getMessages();
    }

    getStatusWriter(): StatusWriter {
        return this._statusStore;
    }

    getStatusMessageStore(): PublishSubscribeStatusMessageStore {
        return this._statusStore;
    }

    private getLocalSetting<K extends TKey>(settingName: K): TSettingTypes[K] | Pending {
        const setting = this._localSettingManagerGetter(settingName);

        if (!this._isInitialized && !setting.isStatic()) {
            this._hasParentDependencies = true;
        }

        if (!this._cachedSettingsMap.has(settingName as string)) {
            // Subscribing to the setting changes so that we can update our value and invalidate
            // the result of the update function when any of the dependencies change
            this._makeLocalSettingGetter(settingName, (value) => {
                this._cachedSettingsMap.set(settingName as string, value);
                this.invalidate();
            });
        }

        if (this._localSettingLoadingStateGetter(settingName) && this._isInitialized) {
            return PENDING;
        }

        // If the dependency has already subscribed to this setting, return the cached value
        // that is updated when the setting changes
        if (this._cachedSettingsMap.has(settingName as string)) {
            return this._cachedSettingsMap.get(settingName as string);
        }

        const value = setting.getValue();
        this._cachedSettingsMap.set(settingName as string, value);

        setting.getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.IS_LOADING)(() => {
            const loading = setting.isLoading();
            if (loading) {
                this.setLoadingState(true);
            }
            // Not subscribing to loading state false as it will
            // be set when this dependency is updated
            // #Waterfall
        });

        setting.getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE_ABOUT_TO_BE_CHANGED)(() => {
            const loading = true;
            if (loading) {
                this.setLoadingState(true);
            }
            // Not subscribing to loading state false as it will
            // be set when this dependency is updated
            // #Waterfall
        });

        return this._cachedSettingsMap.get(settingName as string);
    }

    private setLoadingState(loading: boolean) {
        this._isLoading = loading;
        for (const callback of this._loadingDependencies) {
            callback(loading, this.hasChildDependencies());
        }
    }

    private getGlobalSetting<K extends keyof GlobalSettings>(settingName: K): GlobalSettings[K] | Pending {
        if (!this._cachedGlobalSettingsMap.has(settingName as string)) {
            // Subscribing to the global setting changes so that we can update our value and invalidate
            // the result of the update function when any of the dependencies change
            this._makeGlobalSettingGetter(settingName, (value) => {
                this._cachedGlobalSettingsMap.set(settingName as string, value);
                this.invalidate();
            });
        }

        if (this._globalSettingGetter(settingName) === null && this._isInitialized) {
            return PENDING;
        }

        if (this._cachedGlobalSettingsMap.has(settingName as string)) {
            return this._cachedGlobalSettingsMap.get(settingName as string);
        }

        this._cachedGlobalSettingsMap.set(settingName as string, this._globalSettingGetter(settingName));
        return this._cachedGlobalSettingsMap.get(settingName as string);
    }

    private getHelperDependency<TDep, TDepReads extends Record<string, Read<any>> = Record<string, never>>(
        dep: Dependency<TDep, TSettings, TSettingTypes, TKey, TDepReads>,
    ): Awaited<TDep> | Pending | null {
        if (!this._isInitialized) {
            this._hasParentDependencies = true;
        }

        if (dep.getIsLoading() && this._isInitialized) {
            return PENDING;
        }

        if (this._cachedDependenciesMap.has(dep)) {
            return this._cachedDependenciesMap.get(dep);
        }

        const value = dep.getValue();
        this._cachedDependenciesMap.set(dep, value);

        // Subscribing to the dependency changes so that we can update our value and invalidate
        // the result of the update function when any of the dependencies change
        const unsubscribe = dep.subscribe((newValue) => {
            this._cachedDependenciesMap.set(dep, newValue);
            this.invalidate();
        }, true);
        this._unsubscribers.push(unsubscribe);

        dep.subscribeLoading((loading) => {
            if (loading) {
                this.setLoadingState(true);
            }
            // Not subscribing to loading state false as it will
            // be set when this dependency is updated
            // #Waterfall
        });

        return value;
    }

    async initialize() {
        this._abortController = new AbortController();

        // Establishing subscriptions
        this._isProbing = true;
        try {
            this.runResolverReadOnly();
        } finally {
            this._isProbing = false;
        }

        // If there are no dependencies, we can call the update function
        if (!this._hasParentDependencies) {
            await this.resolve();
        }

        this._isInitialized = true;
    }

    private makeAccessors(): Accessors<TSettings, TSettingTypes, TKey> {
        return {
            localSetting: (key) => {
                const value = this.getLocalSetting(key);
                return value === PENDING ? ({ __ready: false } as const) : ({ __ready: true, value } as const);
            },
            globalSetting: (key) => {
                const value = this.getGlobalSetting(key);
                return value === PENDING ? ({ __ready: false } as const) : ({ __ready: true, value } as const);
            },
            sharedResult: (handle) => {
                const value = this.getHelperDependency(handle);
                return value === PENDING ? ({ __ready: false } as const) : ({ __ready: true, value } as const);
            },
        };
    }

    private runResolverReadOnly(): void {
        if (!this._resolverSpec.read) return;

        // Calling read establishes subscriptions via the accessors
        this._resolverSpec.read({ read: this.makeAccessors() });
    }

    private async runResolver(): Promise<Awaited<TReturnValue> | NoUpdate | Pending> {
        if (this._isProbing) return PENDING;

        const abortSignal = this._abortController?.signal;
        if (!abortSignal) {
            throw new Error("AbortController is not initialized");
        }

        // No reads: always runnable
        if (!this._resolverSpec.read) {
            return (await this._resolverSpec.resolve({} as any, abortSignal)) as any;
        }

        const reads = this._resolverSpec.read({ read: this.makeAccessors() });

        if (!allReady(reads)) {
            return PENDING;
        }

        const values = unwrapReads(reads);
        return (await this._resolverSpec.resolve(values as any, abortSignal)) as any;
    }

    private invalidate(): void {
        if (!this._isLoading) {
            this.setLoadingState(true);
        }

        if (this._updatePromise) {
            this._queued = true;
            return;
        }

        this._updatePromise = this.resolve().finally(() => {
            this._updatePromise = null;
            if (this._queued) {
                this._queued = false;
                this.invalidate();
            }
        });
    }

    private async resolve() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        this._abortController = new AbortController();
        this._statusStore.clear();

        let newValue: Awaited<TReturnValue> | null | NoUpdate | Pending = null;
        try {
            newValue = await this.runResolver();

            // If any of the dependencies are still loading, we don't want to update the value or notify subscribers yet
            if (newValue === PENDING) {
                return;
            }
        } catch (e: any) {
            // Any abort or cancellation error should not be propagated,
            // as they are expected to happen during the lifecycle of the dependency
            // and are handled by not updating the value or notifying subscribers
            const aborted = this._abortController?.signal.aborted || isAbortLike(e);
            if (aborted || isCancelledError(e)) return;

            // If this dependency is not initialized yet and is not a root node, we don't want to update the value or notify subscribers
            // as it might be a dependency that is still being established
            if (!this._isInitialized && this._hasParentDependencies) {
                return;
            }

            this.applyNewValue(null);

            const errorHelper = ApiErrorHelper.fromError(e);
            if (errorHelper) {
                this._statusStore.addError(errorHelper?.makeFullErrorMessage());
            }

            return;
        }

        if (!this._isInitialized && this._hasParentDependencies) {
            return;
        }

        if (newValue === NO_UPDATE) {
            newValue = this._cachedValue;
        }

        this.applyNewValue(newValue);
    }

    private applyNewValue(newValue: Awaited<TReturnValue> | null) {
        this.setLoadingState(false);
        this._cachedValue = newValue;
        for (const callback of this._dependencies) {
            callback(newValue);
        }
    }
}

function isAbortLike(e: any) {
    return (
        e?.name === "AbortError" ||
        e?.code === 20 || // some browsers
        e?.message?.toLowerCase?.().includes("aborted")
    );
}

type Ready<T> = { readonly __ready: true; readonly value: T };
type NotReady = { readonly __ready: false; readonly value?: never };

export type Read<T> = Ready<T> | NotReady;
export type UnwrapRead<R> = R extends Ready<infer V> ? V : never;

function isReady<T>(read: Read<T>): read is Ready<T> {
    return read.__ready;
}

function allReady(reads: Record<string, Read<any>>): boolean {
    for (const r of Object.values(reads)) {
        if (!isReady(r)) return false;
    }
    return true;
}

function unwrapReads<TReads extends Record<string, Read<any>>>(
    reads: TReads,
): { [K in keyof TReads]: UnwrapRead<TReads[K]> } {
    const out: any = {};
    for (const [k, r] of Object.entries(reads)) {
        out[k] = (r as any).value;
    }
    return out;
}

export type NonPending<T> = Exclude<T, Pending>;
