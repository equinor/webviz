import type React from "react";

import type { Getter, Setter } from "jotai";

import type { InitialSettings } from "./InitialSettings";
import type { SettingsContext, ViewContext } from "./ModuleContext";
import type { ModuleDataTagId } from "./ModuleDataTags";
import { ModuleInstance, ModuleInstanceTopic } from "./ModuleInstance";
import type { DrawPreviewFunc } from "./Preview";
import type { SyncSettingKey } from "./SyncSettings";
import type { ChannelDefinition, ChannelReceiverDefinition } from "./types/dataChannnel";
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
> = {
    settingsContext: SettingsContext<TInterfaceTypes>;
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
> = {
    viewContext: ViewContext<TInterfaceTypes>;
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

export type ModuleSettings<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
> = React.FC<ModuleSettingsProps<TInterfaceTypes>>;

export type ModuleView<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
> = React.FC<ModuleViewProps<TInterfaceTypes>>;

export enum ImportStatus {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export interface ModuleOptions {
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
}

export class Module<TInterfaceTypes extends ModuleInterfaceTypes> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TInterfaceTypes>;
    public settingsFC: ModuleSettings<TInterfaceTypes>;
    protected _importState: ImportStatus = ImportStatus.NotImported;
    private _moduleInstances: ModuleInstance<TInterfaceTypes>[] = [];
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

    constructor(options: ModuleOptions) {
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

    makeInstance(id: string): ModuleInstance<TInterfaceTypes> {
        const instance = new ModuleInstance<TInterfaceTypes>({
            module: this,
            id,
            channelDefinitions: this._channelDefinitions,
            channelReceiverDefinitions: this._channelReceiverDefinitions,
        });
        this._moduleInstances.push(instance);
        this.maybeImportSelf();
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

    private initializeModuleInstance(instance: ModuleInstance<TInterfaceTypes>): void {
        instance.initialize();
        if (this._settingsToViewInterfaceInitialization) {
            instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
        }
        instance.makeSettingsToViewInterfaceEffectsAtom();
        if (this._viewToSettingsInterfaceInitialization) {
            instance.makeViewToSettingsInterface(this._viewToSettingsInterfaceInitialization);
        }
        instance.makeViewToSettingsInterfaceEffectsAtom();
    }

    private maybeImportSelf(): void {
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

        importer()
            .then(() => {
                this.setImportState(ImportStatus.Imported);
                this._moduleInstances.forEach((instance) => {
                    this.initializeModuleInstance(instance);
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportStatus.Failed);
            });
    }
}
