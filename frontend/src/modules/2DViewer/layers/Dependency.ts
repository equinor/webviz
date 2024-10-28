import { isEqual } from "lodash";

import { GlobalSettings } from "./LayerManager";
import { SettingsContextDelegate } from "./delegates/SettingsContextDelegate";
import { Settings, UpdateFunc } from "./interfaces";

export class Dependency<TReturnValue, TSettings extends Settings, TKey extends keyof TSettings> {
    private _updateFunc: UpdateFunc<TReturnValue, TSettings, TKey>;
    private _dependencies: Set<(value: TReturnValue) => void> = new Set();
    private _loadingDependencies: Set<(loading: boolean) => void> = new Set();

    private _contextDelegate: SettingsContextDelegate<TSettings, TKey>;

    private _makeSettingGetter: <K extends TKey>(key: K, handler: (value: TSettings[K]) => void) => void;
    private _makeGlobalSettingGetter: <K extends keyof GlobalSettings>(
        key: K,
        handler: (value: GlobalSettings[K]) => void
    ) => void;
    private _cachedSettingsMap: Map<string, any> = new Map();
    private _cachedGlobalSettingsMap: Map<string, any> = new Map();
    private _cachedDependenciesMap: Map<Dependency<any, TSettings, any>, any> = new Map();
    private _cachedValue: Awaited<TReturnValue> | null = null;

    constructor(
        contextDelegate: SettingsContextDelegate<TSettings, TKey>,
        updateFunc: UpdateFunc<TReturnValue, TSettings, TKey>,
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
        this.getSetting = this.getSetting.bind(this);
        this.getDep = this.getDep.bind(this);
    }

    getValue(): Awaited<TReturnValue> | null {
        return this._cachedValue;
    }

    subscribe(callback: (value: TReturnValue) => void): () => void {
        this._dependencies.add(callback);

        return () => {
            this._dependencies.delete(callback);
        };
    }

    subscribeLoading(callback: (loading: boolean) => void): () => void {
        this._loadingDependencies.add(callback);

        return () => {
            this._loadingDependencies.delete(callback);
        };
    }

    private getSetting<K extends TKey>(settingName: K): TSettings[K] {
        if (this._cachedSettingsMap.has(settingName as string)) {
            return this._cachedSettingsMap.get(settingName as string);
        }

        this._makeSettingGetter(settingName, (value) => {
            this._cachedSettingsMap.set(settingName as string, value);
            this.callUpdateFunc();
        });

        return this._contextDelegate.getSettings()[settingName].getDelegate().getValue();
    }

    private setLoadingState(loading: boolean) {
        this._loadingDependencies.forEach((callback) => {
            callback(loading);
        });
    }

    private getGlobalSetting<K extends keyof GlobalSettings>(settingName: K): GlobalSettings[K] {
        if (this._cachedGlobalSettingsMap.has(settingName as string)) {
            return this._cachedGlobalSettingsMap.get(settingName as string);
        }

        this._makeGlobalSettingGetter(settingName, (value) => {
            this._cachedGlobalSettingsMap.set(settingName as string, value);
            this.callUpdateFunc();
        });

        return this._contextDelegate.getLayerManager().getGlobalSetting(settingName);
    }

    private getDep<TDep>(dep: Dependency<TDep, TSettings, TKey>): Awaited<TDep> | null {
        if (this._cachedDependenciesMap.has(dep)) {
            return this._cachedDependenciesMap.get(dep);
        }

        const value = dep.getValue();
        this._cachedDependenciesMap.set(dep, value);
        dep.subscribe((newValue) => {
            this._cachedDependenciesMap.set(dep, newValue);
            this.callUpdateFunc();
        });
        dep.subscribeLoading((loading) => {
            if (loading) {
                this.setLoadingState(true);
            } else {
                this.setLoadingState(false);
            }
        });

        return value;
    }

    async callUpdateFunc() {
        this.setLoadingState(true);
        const newValue = await this._updateFunc({
            getSetting: this.getSetting,
            getGlobalSetting: this.getGlobalSetting,
            getDep: this.getDep,
        });

        if (!isEqual(newValue, this._cachedValue)) {
            this._cachedValue = newValue;
            this._dependencies.forEach((callback) => {
                callback(newValue);
            });
        }
        this.setLoadingState(false);
    }
}
