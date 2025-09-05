import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { DataProviderManagerTopic, type GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import { ExternalSettingController } from "../framework/ExternalSettingController/ExternalSettingController";
import { SettingTopic, type SettingManager } from "../framework/SettingManager/SettingManager";
import type {
    DefineBasicDependenciesArgs,
    SettingAttributes,
    UpdateFunc,
} from "../interfacesAndTypes/customSettingsHandler";
import type { Item } from "../interfacesAndTypes/entities";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { MakeSettingTypesMap, SettingTypes, Settings } from "../settings/settingsDefinitions";

import { Dependency } from "./_utils/Dependency";

export class SharedSettingsDelegate<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    private _externalSettingControllers: { [K in TSettingKey]: ExternalSettingController<K> } = {} as {
        [K in TSettingKey]: ExternalSettingController<K>;
    };
    private _wrappedSettings: { [K in TSettingKey]: SettingManager<K> } = {} as {
        [K in TSettingKey]: SettingManager<K>;
    };
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _dependencies: Dependency<any, TSettings, any, any>[] = [];
    private _parentItem: Item;
    private _customDependenciesDefinition:
        | ((args: DefineBasicDependenciesArgs<TSettings, TSettingTypes, TSettingKey>) => void)
        | null = null;

    constructor(
        parentItem: Item,
        wrappedSettings: { [K in TSettingKey]: SettingManager<K> },
        customDependenciesDefinition?: (
            args: DefineBasicDependenciesArgs<TSettings, TSettingTypes, TSettingKey>,
        ) => void,
    ) {
        this._wrappedSettings = wrappedSettings;
        this._parentItem = parentItem;
        this._customDependenciesDefinition = customDependenciesDefinition ?? null;

        for (const key in wrappedSettings) {
            const setting = wrappedSettings[key];
            const externalSettingController = new ExternalSettingController(parentItem, setting);
            this._externalSettingControllers[key] = externalSettingController;
        }

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        if (!dataProviderManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a data provider manager.");
        }

        this.createDependencies();
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K, SettingTypes[K] | null> } {
        return this._wrappedSettings;
    }

    unsubscribeAll(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    beforeDestroy(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        for (const key in this._externalSettingControllers) {
            const externalSettingController = this._externalSettingControllers[key];
            externalSettingController.beforeDestroy();
        }
        for (const key in this._wrappedSettings) {
            const setting = this._wrappedSettings[key];
            setting.beforeDestroy();
        }
        for (const dependency of this._dependencies) {
            dependency.beforeDestroy();
        }
        this._dependencies = [];
    }

    createDependencies(): void {
        this._unsubscribeFunctionsManagerDelegate.unsubscribe("dependencies");

        this._dependencies = [];

        const makeLocalSettingGetter = <K extends TSettingKey>(key: K, handler: (value: TSettingTypes[K]) => void) => {
            const handleChange = (): void => {
                const setting = this._wrappedSettings[key];
                handler(setting.getValue() as unknown as TSettingTypes[K]);
            };
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dependencies",
                this._wrappedSettings[key].getPublishSubscribeDelegate().makeSubscriberFunction(SettingTopic.VALUE)(
                    handleChange,
                ),
            );

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dependencies",
                this._wrappedSettings[key]
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.IS_LOADING)(() => {
                    if (!this._wrappedSettings[key].isLoading()) {
                        handleChange();
                    }
                }),
            );

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dependencies",
                this._wrappedSettings[key]
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.IS_PERSISTED)(handleChange),
            );

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dependencies",
                this._wrappedSettings[key]
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.IS_INITIALIZED)(handleChange),
            );

            return handleChange;
        };

        const makeGlobalSettingGetter = <K extends keyof GlobalSettings>(
            key: K,
            handler: (value: GlobalSettings[K] | null) => void,
        ) => {
            const handleChange = (): void => {
                handler(this._parentItem.getItemDelegate().getDataProviderManager().getGlobalSetting(key));
            };
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "dependencies",
                this._parentItem
                    .getItemDelegate()
                    .getDataProviderManager()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(DataProviderManagerTopic.GLOBAL_SETTINGS)(handleChange),
            );

            return handleChange.bind(this);
        };

        const loadingStateGetter = <K extends TSettingKey>(settingKey: K): boolean => {
            return this._wrappedSettings[settingKey].isLoading();
        };

        const localSettingManagerGetter = <K extends TSettingKey>(key: K): SettingManager<K> => {
            return this._wrappedSettings[key];
        };

        const globalSettingGetter = <K extends keyof GlobalSettings>(key: K): GlobalSettings[K] | null => {
            return this._parentItem.getItemDelegate().getDataProviderManager().getGlobalSetting(key);
        };

        const settingAttributesUpdater = <K extends TSettingKey>(
            settingKey: K,
            updateFunc: UpdateFunc<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey>,
        ): Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey> => {
            const dependency = new Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey>(
                localSettingManagerGetter.bind(this),
                globalSettingGetter.bind(this),
                updateFunc,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
            );
            this._dependencies.push(dependency);

            dependency.subscribe((attributes: Partial<SettingAttributes> | null) => {
                if (attributes === null) {
                    return;
                }
                this._wrappedSettings[settingKey].updateAttributes(attributes);
            });

            dependency.initialize();

            return dependency;
        };

        if (this._customDependenciesDefinition) {
            this._customDependenciesDefinition({
                settingAttributesUpdater: settingAttributesUpdater.bind(this),
            });
        }
    }
}
