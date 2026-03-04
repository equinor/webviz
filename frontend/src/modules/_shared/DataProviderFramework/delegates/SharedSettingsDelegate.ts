import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import { DataProviderManagerTopic, type GlobalSettings } from "../framework/DataProviderManager/DataProviderManager";
import { ExternalSettingController } from "../framework/ExternalSettingController/ExternalSettingController";
import { SettingTopic, type SettingManager } from "../framework/SettingManager/SettingManager";
import type {
    ResolverSpec,
    SettingAttributes,
    SetupBasicBindingsContext,
    SharedResult,
} from "../interfacesAndTypes/customSettingsHandler";
import type { Item } from "../interfacesAndTypes/entities";
import type { SerializedSettingsState } from "../interfacesAndTypes/serialization";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import { SettingRegistry } from "../settings/SettingRegistry";
import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

import { Dependency, type Read } from "./_utils/Dependency";

export enum SharedSettingsDelegateTopic {
    SETTINGS_CHANGED = "SHARED_SETTINGS_DELEGATE_SETTINGS_CHANGED",
}

export type SharedSettingsDelegatePayloads = {
    [SharedSettingsDelegateTopic.SETTINGS_CHANGED]: void;
};

export class SharedSettingsDelegate<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings> = MakeSettingTypesMap<TSettings>,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> implements PublishSubscribe<SharedSettingsDelegatePayloads>
{
    private _publishSubscribeDelegate: PublishSubscribeDelegate<SharedSettingsDelegatePayloads> =
        new PublishSubscribeDelegate<SharedSettingsDelegatePayloads>();
    private _externalSettingControllers: { [K in TSettingKey]: ExternalSettingController<K> } = {} as {
        [K in TSettingKey]: ExternalSettingController<K>;
    };
    private _wrappedSettings: { [K in TSettingKey]: SettingManager<K> } = {} as {
        [K in TSettingKey]: SettingManager<K>;
    };
    private _internalSettings: Map<TSettingKey, SettingManager<any>> = new Map();
    private _unsubscribeFunctionsManagerDelegate: UnsubscribeFunctionsManagerDelegate =
        new UnsubscribeFunctionsManagerDelegate();
    private _dependencies: Dependency<any, TSettings, any, any, any>[] = [];
    private _parentItem: Item;
    private _setupBasicBindingsContext:
        | ((args: SetupBasicBindingsContext<TSettings, TSettingTypes, TSettingKey>) => void)
        | null = null;

    constructor(
        parentItem: Item,
        wrappedSettings: { [K in TSettingKey]: SettingManager<K> },
        setupBasicBindingsContext?: (args: SetupBasicBindingsContext<TSettings, TSettingTypes, TSettingKey>) => void,
    ) {
        this._wrappedSettings = wrappedSettings;
        this._parentItem = parentItem;
        this._setupBasicBindingsContext = setupBasicBindingsContext ?? null;

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        if (!dataProviderManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a data provider manager.");
        }

        // Create dependencies first, which may populate _internalSettings
        this.createDependencies();

        // Now create external controllers, passing internal settings if they exist
        for (const key in wrappedSettings) {
            const setting = wrappedSettings[key];
            const internalSetting = this._internalSettings.get(key);
            const externalSettingController = new ExternalSettingController(parentItem, setting, internalSetting);
            this._externalSettingControllers[key] = externalSettingController;

            // Subscribe to changes in the external setting controller to notify listeners
            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                "externalSettingControllers",
                externalSettingController
                    .getSetting()
                    .getPublishSubscribeDelegate()
                    .makeSubscriberFunction(SettingTopic.VALUE)(() => {
                    this.handleSettingChanged();
                }),
            );
        }
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SharedSettingsDelegatePayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends SharedSettingsDelegateTopic.SETTINGS_CHANGED>(
        topic: T,
    ): () => SharedSettingsDelegatePayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SharedSettingsDelegateTopic.SETTINGS_CHANGED) {
                return;
            }
        };

        return snapshotGetter;
    }

    private handleSettingChanged(): void {
        this._publishSubscribeDelegate.notifySubscribers(SharedSettingsDelegateTopic.SETTINGS_CHANGED);
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K> } {
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
        for (const internalSetting of this._internalSettings.values()) {
            internalSetting.beforeDestroy();
        }
        this._internalSettings.clear();
        for (const dependency of this._dependencies) {
            dependency.beforeDestroy();
        }
        this._dependencies = [];
    }

    serializeSettings(): SerializedSettingsState<TSettings, TSettingKey> {
        const serializedSettings: SerializedSettingsState<TSettings, TSettingKey> = {} as SerializedSettingsState<
            TSettings,
            TSettingKey
        >;
        for (const key in this._wrappedSettings) {
            serializedSettings[key] = this._wrappedSettings[key].serializeValue();
        }
        return serializedSettings;
    }

    deserializeSettings(serializedSettings: SerializedSettingsState<TSettings, TSettingKey>): void {
        for (const [key, value] of Object.entries(serializedSettings)) {
            const settingDelegate = this._wrappedSettings[key as TSettingKey];
            settingDelegate.deserializeValue(value as string);
            if (settingDelegate.isStatic()) {
                settingDelegate.maybeResetPersistedValue();
                settingDelegate.initialize();
            }
        }
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

        const createDependency = <T, TReads extends Record<string, Read<any>> = Record<string, never>>(
            debugName: string,
            resolverSpec: ResolverSpec<T, TSettings, TSettingTypes, TSettingKey, TReads>,
        ): Dependency<T, TSettings, TSettingTypes, TSettingKey, TReads> => {
            const dependency = new Dependency<T, TSettings, TSettingTypes, TSettingKey, TReads>(
                localSettingManagerGetter,
                globalSettingGetter,
                resolverSpec,
                makeLocalSettingGetter,
                loadingStateGetter,
                makeGlobalSettingGetter,
                debugName,
            );
            this._dependencies.push(dependency);
            dependency.initialize();
            return dependency;
        };

        const bindValueConstraints = <
            K extends TSettingKey,
            TReads extends Record<string, Read<any>> = Record<string, never>,
        >(
            settingKey: K,
            resolverSpec: ResolverSpec<
                SettingTypeDefinitions[K]["valueConstraints"],
                TSettings,
                TSettingTypes,
                TSettingKey,
                TReads
            >,
        ): Dependency<SettingTypeDefinitions[K]["valueConstraints"], TSettings, TSettingTypes, TSettingKey, TReads> => {
            if (!this._internalSettings.has(settingKey)) {
                const internalSetting = SettingRegistry.makeSetting(settingKey, null);
                // Mark as loading initially so the intersection waits for the value constraints to be computed
                internalSetting.setLoading(true);
                this._internalSettings.set(settingKey, internalSetting);
            }

            const internalSetting = this._internalSettings.get(settingKey)!;

            const debugName = `ValueConstraintsUpdater_${settingKey}`;
            const dependency = createDependency(debugName, resolverSpec);

            dependency.subscribe((valueConstraints) => {
                // Set the value constraints on the internal setting, not the wrapped setting
                if (valueConstraints === null) {
                    internalSetting.setValueConstraints(null as SettingTypeDefinitions[K]["valueConstraints"]);
                    return;
                }
                internalSetting.setValueConstraints(valueConstraints);
            });

            dependency.subscribeLoading((loading: boolean) => {
                if (loading) {
                    internalSetting.setLoading(loading);
                }
            });

            return dependency;
        };

        const bindAttributes = <
            K extends TSettingKey,
            TReads extends Record<string, Read<any>> = Record<string, never>,
        >(
            settingKey: K,
            resolverSpec: ResolverSpec<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey, TReads>,
        ): Dependency<Partial<SettingAttributes>, TSettings, TSettingTypes, TSettingKey, TReads> => {
            const debugName = `SettingAttributesUpdater_${settingKey}`;
            const dependency = createDependency(debugName, resolverSpec);

            dependency.subscribe((attributes: Partial<SettingAttributes> | null) => {
                if (attributes === null) {
                    return;
                }
                this._wrappedSettings[settingKey].updateAttributes(attributes);
            });

            dependency.subscribeLoading(() => {
                this.handleSettingChanged();
            });

            return dependency;
        };

        const makeSharedResult = <T, TReads extends Record<string, Read<any>> = Record<string, never>>(
            args: ResolverSpec<T, TSettings, TSettingTypes, TSettingKey, TReads> & { debugName: string },
        ) => {
            const { debugName, ...resolverSpec } = args;
            const dependency = createDependency(
                debugName,
                resolverSpec as ResolverSpec<T, TSettings, TSettingTypes, TSettingKey, TReads>,
            );

            dependency.subscribeLoading(() => {
                this.handleSettingChanged();
            });

            return dependency as SharedResult<T, TSettings, TSettingTypes, TSettingKey, TReads>;
        };

        const dataProviderManager = this._parentItem.getItemDelegate().getDataProviderManager();

        const context: SetupBasicBindingsContext<TSettings, TSettingTypes, TSettingKey> = {
            setting: <K extends TSettingKey>(settingKey: K) => ({
                bindValueConstraints: <TReads extends Record<string, Read<any>> = Record<string, never>>(
                    resolverSpec: ResolverSpec<
                        SettingTypeDefinitions[K]["valueConstraints"],
                        TSettings,
                        TSettingTypes,
                        TSettingKey,
                        TReads
                    >,
                ) => bindValueConstraints(settingKey, resolverSpec),
                bindAttributes: <TReads extends Record<string, Read<any>> = Record<string, never>>(
                    resolverSpec: ResolverSpec<
                        Partial<SettingAttributes>,
                        TSettings,
                        TSettingTypes,
                        TSettingKey,
                        TReads
                    >,
                ) => bindAttributes(settingKey, resolverSpec),
            }),

            makeSharedResult,

            workbenchSession: dataProviderManager.getWorkbenchSession(),
            workbenchSettings: dataProviderManager.getWorkbenchSettings(),
            queryClient: dataProviderManager.getQueryClient(),
        };

        if (this._setupBasicBindingsContext) {
            this._setupBasicBindingsContext(context);
        }
    }
}
