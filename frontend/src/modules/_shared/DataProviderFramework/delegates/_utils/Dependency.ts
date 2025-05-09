import { isCancelledError } from "@tanstack/react-query";

import type { GlobalSettings } from "../../framework/DataProviderManager/DataProviderManager";
import { SettingTopic, type SettingManager } from "../../framework/SettingManager/SettingManager";
import type { UpdateFunc } from "../../interfacesAndTypes/customSettingsHandler";
import type { SettingsKeysFromTuple } from "../../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, Settings } from "../../settings/settingsDefinitions";

class DependencyLoadingError extends Error {}

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
> {
    private _updateFunc: UpdateFunc<TReturnValue, TSettings, TSettingTypes, TKey>;
    private _dependencies: Set<(value: Awaited<TReturnValue> | null) => void> = new Set();
    private _loadingDependencies: Set<(loading: boolean, hasDependencies: boolean) => void> = new Set();
    private _isLoading = false;

    private _localSettingManagerGetter: <K extends TKey>(key: K) => SettingManager<K>;
    private _globalSettingGetter: <K extends keyof GlobalSettings>(key: K) => GlobalSettings[K];

    private _makeLocalSettingGetter: <K extends TKey>(key: K, handler: (value: TSettingTypes[K]) => void) => void;
    private _localSettingLoadingStateGetter: <K extends TKey>(key: K) => boolean;
    private _makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
        key: K,
        handler: (value: GlobalSettings[K]) => void,
    ) => void;
    private _cachedSettingsMap: Map<string, any> = new Map();
    private _cachedGlobalSettingsMap: Map<string, any> = new Map();
    private _cachedDependenciesMap: Map<Dependency<any, TSettings, TSettingTypes, any>, any> = new Map();
    private _cachedValue: Awaited<TReturnValue> | null = null;
    private _abortController: AbortController | null = null;
    private _isInitialized = false;
    private _numParentDependencies = 0;
    private _numChildDependencies = 0;

    constructor(
        localSettingManagerGetter: <K extends TKey>(key: K) => SettingManager<K>,
        globalSettingGetter: <K extends keyof GlobalSettings>(key: K) => GlobalSettings[K],
        updateFunc: UpdateFunc<TReturnValue, TSettings, TSettingTypes, TKey>,
        makeLocalSettingGetter: <K extends TKey>(key: K, handler: (value: TSettingTypes[K]) => void) => void,
        localSettingLoadingStateGetter: <K extends TKey>(key: K) => boolean,
        makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K]) => void,
        ) => void,
    ) {
        this._localSettingManagerGetter = localSettingManagerGetter;
        this._globalSettingGetter = globalSettingGetter;
        this._updateFunc = updateFunc;
        this._makeLocalSettingGetter = makeLocalSettingGetter;
        this._localSettingLoadingStateGetter = localSettingLoadingStateGetter;
        this._makeGlobalSettingGetter = makeGlobalSettingGetter;

        this.getGlobalSetting = this.getGlobalSetting.bind(this);
        this.getLocalSetting = this.getLocalSetting.bind(this);
        this.getHelperDependency = this.getHelperDependency.bind(this);
    }

    beforeDestroy() {
        this._abortController?.abort();
        this._abortController = null;
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

    private getLocalSetting<K extends TKey>(settingName: K): TSettingTypes[K] {
        if (!this._isInitialized) {
            this._numParentDependencies++;
        }

        if (this._localSettingLoadingStateGetter(settingName)) {
            throw new DependencyLoadingError("Setting is loading");
        }

        // If the dependency has already subscribed to this setting, return the cached value
        // that is updated when the setting changes
        if (this._cachedSettingsMap.has(settingName as string)) {
            return this._cachedSettingsMap.get(settingName as string);
        }

        const setting = this._localSettingManagerGetter(settingName);
        const value = setting.getValue();
        this._cachedSettingsMap.set(settingName as string, value);

        this._makeLocalSettingGetter(settingName, (value) => {
            this._cachedSettingsMap.set(settingName as string, value);
            this.invalidate();
        });

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

    private getGlobalSetting<K extends keyof GlobalSettings>(settingName: K): GlobalSettings[K] {
        if (this._cachedGlobalSettingsMap.has(settingName as string)) {
            return this._cachedGlobalSettingsMap.get(settingName as string);
        }

        this._makeGlobalSettingGetter(settingName, (value) => {
            this._cachedGlobalSettingsMap.set(settingName as string, value);
            this.invalidate();
        });

        this._cachedGlobalSettingsMap.set(settingName as string, this._globalSettingGetter(settingName));
        return this._cachedGlobalSettingsMap.get(settingName as string);
    }

    private getHelperDependency<TDep>(dep: Dependency<TDep, TSettings, TSettingTypes, TKey>): Awaited<TDep> | null {
        if (!this._isInitialized) {
            this._numParentDependencies++;
        }

        if (dep.getIsLoading()) {
            throw new DependencyLoadingError("Dependency is loading");
        }

        if (this._cachedDependenciesMap.has(dep)) {
            return this._cachedDependenciesMap.get(dep);
        }

        const value = dep.getValue();
        this._cachedDependenciesMap.set(dep, value);

        dep.subscribe((newValue) => {
            this._cachedDependenciesMap.set(dep, newValue);
            this.invalidate();
        }, true);

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
        await this._updateFunc({
            getLocalSetting: this.getLocalSetting,
            getGlobalSetting: this.getGlobalSetting,
            getHelperDependency: this.getHelperDependency,
            abortSignal: this._abortController.signal,
        });

        // If there are no dependencies, we can call the update function
        if (this._numParentDependencies === 0) {
            await this.callUpdateFunc();
        }

        this._isInitialized = true;
    }

    private invalidate(): void {
        if (!this._isLoading) {
            this.setLoadingState(true);
        }
        this.callUpdateFunc();
    }

    private async callUpdateFunc() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        this._abortController = new AbortController();

        let newValue: Awaited<TReturnValue> | null = null;
        try {
            newValue = await this._updateFunc({
                getLocalSetting: this.getLocalSetting,
                getGlobalSetting: this.getGlobalSetting,
                getHelperDependency: this.getHelperDependency,
                abortSignal: this._abortController.signal,
            });
        } catch (e: any) {
            if (e instanceof DependencyLoadingError) {
                return;
            }

            if (!isCancelledError(e)) {
                this.applyNewValue(null);
                return;
            }
            return;
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
