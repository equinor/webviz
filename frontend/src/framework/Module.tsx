import type React from "react";

import type { JTDSchemaType } from "ajv/dist/core";
import type { Getter, Setter } from "jotai";

import type { AtomStoreMaster } from "./AtomStoreMaster";
import type { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import type { InitialSettings } from "./InitialSettings";
import type { SettingsContext, ViewContext } from "./ModuleContext";
import type { ModuleDataTagId } from "./ModuleDataTags";
import { ModuleInstance, ModuleInstanceTopic } from "./ModuleInstance";
import type { DrawPreviewFunc } from "./Preview";
import type { SyncSettingKey } from "./SyncSettings";
import type { InterfaceBaseType, InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";
import type { WorkbenchServices } from "./WorkbenchServices";
import type { WorkbenchSession } from "./WorkbenchSession";
import type { WorkbenchSettings } from "./WorkbenchSettings";

export type OnInstanceUnloadFunc = (instanceId: string) => void;

const moduleImporters = import.meta.glob("/src/modules/*/loadModule.tsx");

export enum ModuleCategory {
    MAIN = "main",
    SUB = "sub",
    DEBUG = "debug",
}

export enum ModuleDevState {
    PROD = "prod",
    DEV = "dev",
    DEPRECATED = "deprecated",
}

export type ModuleInterfaceTypes = {
    settingsToView?: InterfaceBaseType;
    viewToSettings?: InterfaceBaseType;
};

export type ModuleInterfacesInitializations<TInterfaceTypes extends ModuleInterfaceTypes> = {
    settingsToView: TInterfaceTypes["settingsToView"] extends undefined
        ? undefined
        : InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>;
    viewToSettings: TInterfaceTypes["viewToSettings"] extends undefined
        ? undefined
        : InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>;
};

export type ModuleSettingsProps<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDef extends ModuleComponentsStateBase = NoModuleStateSchema,
> = {
    settingsContext: SettingsContext<TInterfaceTypes, TSerializedStateDef>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleViewProps<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDef extends ModuleComponentsStateBase = NoModuleStateSchema,
> = {
    viewContext: ViewContext<TInterfaceTypes, TSerializedStateDef>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type InterfaceEffects<TInterfaceType extends InterfaceBaseType> = ((
    getInterfaceValue: <TKey extends keyof TInterfaceType>(key: TKey) => TInterfaceType[TKey],
    setAtomValue: Setter,
    getAtomValue: Getter,
) => void)[];

export type JTDBaseType = Record<string, unknown>;

export type ModuleComponentsStateBase = {
    settings?: Record<string, any>;
    view?: Record<string, any>;
};

export type SerializedModuleComponentsState<TSerializedStateDef extends ModuleComponentsStateBase> = {
    settings: TSerializedStateDef["settings"];
    view: TSerializedStateDef["view"];
};

export type NoModuleStateSchema = {
    settings: Record<string, never>;
    view: Record<string, never>;
};

export type ModuleStateSchema<TSerializedStateDef extends ModuleComponentsStateBase> = {
    settings?: JTDSchemaType<TSerializedStateDef["settings"]>;
    view?: JTDSchemaType<TSerializedStateDef["view"]>;
};

export interface SerializeStateFunction<T> {
    (get: Getter): T;
}

export interface DeserializeStateFunction<T> {
    (raw: T, set: Setter): void;
}

export type ModuleComponentSerializationFunctions<TSerializedStateDef extends ModuleComponentsStateBase> =
    TSerializedStateDef extends NoModuleStateSchema
        ? {
              serializeStateFunctions?: never;
              deserializeStateFunctions?: never;
          }
        : {
              serializeStateFunctions: {
                  settings?: SerializeStateFunction<TSerializedStateDef["settings"]>;
                  view?: SerializeStateFunction<TSerializedStateDef["view"]>;
              };
              deserializeStateFunctions: {
                  settings?: DeserializeStateFunction<TSerializedStateDef["settings"]>;
                  view?: DeserializeStateFunction<TSerializedStateDef["view"]>;
              };
          };

export function hasSerialization<T extends ModuleComponentsStateBase>(
    val: ModuleComponentSerializationFunctions<T>,
): val is Exclude<typeof val, { serializeStateFunctions?: never }> {
    return !!(val as any).serializeStateFunctions;
}

export type MakeReadonly<T> = {
    readonly [P in keyof T]: T[P];
};

export type ModuleSettings<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDef extends ModuleComponentsStateBase = NoModuleStateSchema,
> = React.FC<ModuleSettingsProps<TInterfaceTypes, TSerializedStateDef>>;

export type ModuleView<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDef extends ModuleComponentsStateBase = NoModuleStateSchema,
> = React.FC<ModuleViewProps<TInterfaceTypes, TSerializedStateDef>>;

export enum ImportStatus {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export type ModuleOptions<TSerializedState extends ModuleComponentsStateBase> = {
    name: string;
    defaultTitle: string;
    category: ModuleCategory;
    devState: ModuleDevState;
    dataTagIds?: ModuleDataTagId[];
    syncableSettingKeys?: SyncSettingKey[];
    drawPreviewFunc?: DrawPreviewFunc;
    description?: string;
    channelDefinitions?: ChannelDefinition[];
    channelReceiverDefinitions?: ChannelReceiverDefinition[];
    onInstanceUnloadFunc?: OnInstanceUnloadFunc;
    serializedStateSchema?: ModuleStateSchema<TSerializedState>;
};

export class Module<TInterfaceTypes extends ModuleInterfaceTypes, TSerializedState extends ModuleComponentsStateBase> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TInterfaceTypes, TSerializedState>;
    public settingsFC: ModuleSettings<TInterfaceTypes, TSerializedState>;
    protected _importState: ImportStatus = ImportStatus.NotImported;
    private _moduleInstances: ModuleInstance<TInterfaceTypes, TSerializedState>[] = [];
    private _settingsToViewInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewToSettingsInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _viewToSettingsInterfaceEffects: InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>> =
        [];
    private _settingsToViewInterfaceEffects: InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>> =
        [];
    private _syncableSettingKeys: SyncSettingKey[];
    private _drawPreviewFunc: DrawPreviewFunc | null;
    private _onInstanceUnloadFunc: OnInstanceUnloadFunc | null;
    private _description: string | null;
    private _channelDefinitions: ChannelDefinition[] | null;
    private _channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
    private _category: ModuleCategory;
    private _devState: ModuleDevState;
    private _dataTagIds: ModuleDataTagId[];
    private _serializedStateSchema: ModuleStateSchema<TSerializedState> | null;
    private _serializationFunctions: ModuleComponentSerializationFunctions<TSerializedState> | undefined;
    private _atomStoreMaster: AtomStoreMaster | null = null;

    constructor(options: ModuleOptions<TSerializedState>) {
        this._name = options.name;
        this._defaultTitle = options.defaultTitle;
        this._category = options.category;
        this._devState = options.devState;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this._syncableSettingKeys = options.syncableSettingKeys ?? [];
        this._drawPreviewFunc = options.drawPreviewFunc ?? null;
        this._onInstanceUnloadFunc = options.onInstanceUnloadFunc ?? null;
        this._description = options.description ?? null;
        this._channelDefinitions = options.channelDefinitions ?? null;
        this._channelReceiverDefinitions = options.channelReceiverDefinitions ?? null;
        this._dataTagIds = options.dataTagIds ?? [];
        this._serializedStateSchema = options.serializedStateSchema ?? null;
    }

    getSerializedStateSchema(): ModuleStateSchema<TSerializedState> | null {
        return this._serializedStateSchema;
    }

    getDrawPreviewFunc(): DrawPreviewFunc | null {
        return this._drawPreviewFunc;
    }

    getImportState(): ImportStatus {
        return this._importState;
    }

    getName(): string {
        return this._name;
    }

    getDefaultTitle(): string {
        return this._defaultTitle;
    }

    getCategory(): ModuleCategory {
        return this._category;
    }

    getDevState(): ModuleDevState {
        return this._devState;
    }

    getDataTagIds(): ModuleDataTagId[] {
        return this._dataTagIds;
    }

    getDescription(): string | null {
        return this._description;
    }

    setSettingsToViewInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>,
    ): void {
        this._settingsToViewInterfaceInitialization = interfaceInitialization;
    }

    setViewToSettingsInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>,
    ): void {
        this._viewToSettingsInterfaceInitialization = interfaceInitialization;
    }

    setViewToSettingsInterfaceEffects(
        atomsInitialization: InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>>,
    ): void {
        this._viewToSettingsInterfaceEffects = atomsInitialization;
    }

    setSettingsToViewInterfaceEffects(
        atomsInitialization: InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>>,
    ): void {
        this._settingsToViewInterfaceEffects = atomsInitialization;
    }

    setSerializationFunctions(serializationFunctions: ModuleComponentSerializationFunctions<TSerializedState>): void {
        this._serializationFunctions = serializationFunctions;
    }

    getComponentSerializationFunctions(): ModuleComponentSerializationFunctions<TSerializedState> | undefined {
        return this._serializationFunctions;
    }

    getViewToSettingsInterfaceEffects(): InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>> {
        return this._viewToSettingsInterfaceEffects;
    }

    getSettingsToViewInterfaceEffects(): InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>> {
        return this._settingsToViewInterfaceEffects;
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    async makeInstance(
        id: string,
        atomStoreMaster: AtomStoreMaster,
    ): Promise<ModuleInstance<TInterfaceTypes, TSerializedState>> {
        const instance = new ModuleInstance<TInterfaceTypes, TSerializedState>({
            module: this,
            atomStoreMaster,
            id,
            channelDefinitions: this._channelDefinitions,
            channelReceiverDefinitions: this._channelReceiverDefinitions,
        });
        this._moduleInstances.push(instance);
        atomStoreMaster.makeAtomStoreForModuleInstance(id);
        await this.maybeImportSelf();
        return instance;
    }

    onInstanceUnload(instanceId: string) {
        this._onInstanceUnloadFunc?.(instanceId);
    }

    private setImportState(state: ImportStatus): void {
        this._importState = state;
        this._moduleInstances.forEach((instance) => {
            instance.notifySubscribers(ModuleInstanceTopic.IMPORT_STATUS);
        });
    }

    private initializeModuleInstance(instance: ModuleInstance<TInterfaceTypes, TSerializedState>): void {
        if (this._settingsToViewInterfaceInitialization) {
            instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
        }
        instance.makeSettingsToViewInterfaceEffectsAtom();
        if (this._viewToSettingsInterfaceInitialization) {
            instance.makeViewToSettingsInterface(this._viewToSettingsInterfaceInitialization);
        }
        instance.makeViewToSettingsInterfaceEffectsAtom();
        if (this._serializationFunctions) {
            instance.makeSerializer(this._serializationFunctions);
        }
        instance.initialize();
    }

    private async maybeImportSelf(): Promise<void> {
        if (this._importState !== ImportStatus.NotImported) {
            if (this._importState === ImportStatus.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (instance.isInitialized()) {
                        return;
                    }
                    this.initializeModuleInstance(instance);
                });
            }
            return;
        }

        this.setImportState(ImportStatus.Importing);

        const path = `/src/modules/${this._name}/loadModule.tsx`;
        const importer = moduleImporters[path];

        if (!importer) {
            console.error(`Module importer not found for ${path}`);
            this.setImportState(ImportStatus.Failed);
            return;
        }

        try {
            await importer();
            this.setImportState(ImportStatus.Imported);
            this._moduleInstances.forEach((instance) => {
                this.initializeModuleInstance(instance);
            });
        } catch (e) {
            console.error(`Failed to initialize module ${this._name}`, e);
            this.setImportState(ImportStatus.Failed);
        }
    }
}
