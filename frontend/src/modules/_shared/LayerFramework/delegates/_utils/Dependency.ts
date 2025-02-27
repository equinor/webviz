import { isCancelledError } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { GlobalSettings } from "../../framework/DataLayerManager/DataLayerManager";
import { Settings, UpdateFunc } from "../../interfaces";
import { AllSettingTypes } from "../../settings/settingsTypes";
import { SettingsContextDelegate } from "../SettingsContextDelegate";

/*
 * Dependency class is used to represent a node in the dependency graph of a layer settings context.
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
    TSettingTypes extends Settings,
    TSettings extends Partial<AllSettingTypes>,
    TKey extends keyof TSettings
> {
    private _updateFunc: UpdateFunc<TReturnValue, TSettingTypes, TSettings, TKey>;
    private _dependencies: Set<(value: Awaited<TReturnValue> | null) => void> = new Set();
    private _loadingDependencies: Set<(loading: boolean, hasDependencies: boolean) => void> = new Set();

    private _contextDelegate: SettingsContextDelegate<TSettingTypes, any, TSettings, TKey, any>;

    private _makeSettingGetter: <K extends TKey>(key: K, handler: (value: TSettings[K]) => void) => void;
    private _makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
        key: K,
        handler: (value: GlobalSettings[K]) => void
    ) => void;
    private _cachedSettingsMap: Map<string, any> = new Map();
    private _cachedGlobalSettingsMap: Map<string, any> = new Map();
    private _cachedDependenciesMap: Map<Dependency<any, TSettingTypes, TSettings, any>, any> = new Map();
    private _cachedValue: Awaited<TReturnValue> | null = null;
    private _abortController: AbortController | null = null;
    private _isInitialized = false;
    private _numParentDependencies = 0;
    private _numChildDependencies = 0;

    constructor(
        contextDelegate: SettingsContextDelegate<TSettingTypes, any, TSettings, TKey, any>,
        updateFunc: UpdateFunc<TReturnValue, TSettingTypes, TSettings, TKey>,
        makeSettingGetter: <K extends TKey>(key: K, handler: (value: TSettings[K]) => void) => void,
        makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K]) => void
        ) => void
    ) {
        this._contextDelegate = contextDelegate;
        this._updateFunc = updateFunc;
        this._makeSettingGetter = makeSettingGetter;
        this._makeGlobalSettingGetter = makeGlobalSettingGetter;

        this.getGlobalSetting = this.getGlobalSetting.bind(this);
        this.getLocalSetting = this.getLocalSetting.bind(this);
        this.getHelperDependency = this.getHelperDependency.bind(this);
    }

    hasChildDependencies(): boolean {
        return this._numChildDependencies > 0;
    }

    getValue(): Awaited<TReturnValue> | null {
        return this._cachedValue;
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

    private getLocalSetting<K extends TKey>(settingName: K): TSettings[K] {
        if (!this._isInitialized) {
            this._numParentDependencies++;
        }

        if (this._cachedSettingsMap.has(settingName as string)) {
            return this._cachedSettingsMap.get(settingName as string);
        }

        this._makeSettingGetter(settingName, (value) => {
            this._cachedSettingsMap.set(settingName as string, value);
            this.callUpdateFunc();
        });

        this._cachedSettingsMap.set(
            settingName as string,
            this._contextDelegate.getSettings()[settingName].getDelegate().getValue()
        );
        return this._cachedSettingsMap.get(settingName as string);
    }

    private setLoadingState(loading: boolean) {
        for (const callback of this._loadingDependencies) {
            callback(loading, this.hasChildDependencies());
        }
    }

    private getGlobalSetting<K extends keyof GlobalSettings>(settingName: K): GlobalSettings[K] {
        if (this._cachedGlobalSettingsMap.has(settingName as string)) {
            return this._cachedGlobalSettingsMap.get(settingName as string);
        }

        this._makeGlobalSettingGetter(settingName, (value) => {
            const cachedValue = this._cachedGlobalSettingsMap.get(settingName as string);
            if (isEqual(value, cachedValue)) {
                return;
            }
            this._cachedGlobalSettingsMap.set(settingName as string, value);
            this.callUpdateFunc();
        });

        this._cachedGlobalSettingsMap.set(
            settingName as string,
            this._contextDelegate.getLayerManager().getGlobalSetting(settingName)
        );
        return this._cachedGlobalSettingsMap.get(settingName as string);
    }

    private getHelperDependency<TDep>(dep: Dependency<TDep, TSettingTypes, TSettings, TKey>): Awaited<TDep> | null {
        if (!this._isInitialized) {
            this._numParentDependencies++;
        }

        if (this._cachedDependenciesMap.has(dep)) {
            return this._cachedDependenciesMap.get(dep);
        }

        const value = dep.getValue();
        this._cachedDependenciesMap.set(dep, value);

        dep.subscribe((newValue) => {
            this._cachedDependenciesMap.set(dep, newValue);
            this.callUpdateFunc();
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

    private async callUpdateFunc() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        this._abortController = new AbortController();

        this.setLoadingState(true);

        let newValue: Awaited<TReturnValue> | null = null;
        try {
            newValue = await this._updateFunc({
                getLocalSetting: this.getLocalSetting,
                getGlobalSetting: this.getGlobalSetting,
                getHelperDependency: this.getHelperDependency,
                abortSignal: this._abortController.signal,
            });
        } catch (e: any) {
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
        if (!isEqual(newValue, this._cachedValue) || newValue === null) {
            this._cachedValue = newValue;
            for (const callback of this._dependencies) {
                callback(newValue);
            }
        }
    }
}
