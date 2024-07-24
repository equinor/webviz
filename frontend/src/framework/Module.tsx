import React from "react";

import { Atom, PrimitiveAtom, WritableAtom } from "jotai";

import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { SettingsContext, ViewContext } from "./ModuleContext";
import { ModuleDataTagId } from "./ModuleDataTags";
import { ModuleInstance, ModuleInstanceTopic } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceBaseType,
    InterfaceInitialization,
    UniDirectionalModuleComponentsInterface,
} from "./UniDirectionalModuleComponentsInterface";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { WorkbenchSettings } from "./WorkbenchSettings";

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

export type ModuleInterfacesInitialization<TInterfaceTypes extends ModuleInterfaceTypes> = {
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
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = {
    settingsContext: SettingsContext<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
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
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = {
    viewContext: ViewContext<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleAtoms<TAtoms extends Record<string, unknown>> = {
    [K in keyof TAtoms]: Atom<TAtoms[K]> | WritableAtom<TAtoms[K], [TAtoms[K]], void> | PrimitiveAtom<TAtoms[K]>;
};

export type AtomsInitialization<TAtoms extends Record<string, unknown>, TInterfaceType extends InterfaceBaseType> = (
    settingsToViewInterface: UniDirectionalModuleComponentsInterface<TInterfaceType>
) => ModuleAtoms<TAtoms>;

export type ModuleSettings<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = React.FC<ModuleSettingsProps<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>>;

export type ModuleView<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = React.FC<ModuleViewProps<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>>;

export enum ImportState {
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
}

export class Module<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
    public settingsFC: ModuleSettings<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>;
    protected _importState: ImportState = ImportState.NotImported;
    private _moduleInstances: ModuleInstance<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>[] = [];
    private _settingsToViewInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewToSettingsInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _settingsAtomsInitialization: AtomsInitialization<
        TSettingsAtomsType,
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewAtomsInitialization: AtomsInitialization<
        TViewAtomsType,
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _workbench: Workbench | null = null;
    private _syncableSettingKeys: SyncSettingKey[];
    private _drawPreviewFunc: DrawPreviewFunc | null;
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
        this._description = options.description ?? null;
        this._channelDefinitions = options.channelDefinitions ?? null;
        this._channelReceiverDefinitions = options.channelReceiverDefinitions ?? null;
        this._dataTagIds = options.dataTagIds ?? [];
    }

    getDrawPreviewFunc(): DrawPreviewFunc | null {
        return this._drawPreviewFunc;
    }

    getImportState(): ImportState {
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

    setWorkbench(workbench: Workbench): void {
        this._workbench = workbench;
    }

    setSettingsToViewInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>
    ): void {
        this._settingsToViewInterfaceInitialization = interfaceInitialization;
    }

    setViewToSettingsInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>
    ): void {
        this._viewToSettingsInterfaceInitialization = interfaceInitialization;
    }

    setSettingsAtomsInitialization(
        atomsInitialization: AtomsInitialization<
            TSettingsAtomsType,
            Exclude<TInterfaceTypes["settingsToView"], undefined>
        >
    ): void {
        this._settingsAtomsInitialization = atomsInitialization;
    }

    setViewAtomsInitialization(
        atomsInitialization: AtomsInitialization<TViewAtomsType, Exclude<TInterfaceTypes["viewToSettings"], undefined>>
    ): void {
        this._viewAtomsInitialization = atomsInitialization;
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(instanceNumber: number): ModuleInstance<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<TInterfaceTypes, TSettingsAtomsType, TViewAtomsType>({
            module: this,
            workbench: this._workbench,
            instanceNumber,
            channelDefinitions: this._channelDefinitions,
            channelReceiverDefinitions: this._channelReceiverDefinitions,
        });
        this._moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this._importState = state;
        this._moduleInstances.forEach((instance) => {
            instance.notifySubscribers(ModuleInstanceTopic.IMPORT_STATE);
        });

        if (this._workbench && state === ImportState.Imported) {
            this._workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (instance.isInitialized()) {
                        return;
                    }
                    instance.initialize();
                    if (this._settingsToViewInterfaceInitialization) {
                        instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
                        if (this._viewAtomsInitialization) {
                            instance.makeViewAtoms(this._viewAtomsInitialization);
                        }
                    }
                    if (this._viewToSettingsInterfaceInitialization) {
                        instance.makeViewToSettingsInterface(this._viewToSettingsInterfaceInitialization);
                        if (this._settingsAtomsInitialization) {
                            instance.makeSettingsAtoms(this._settingsAtomsInitialization);
                        }
                    }
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this._moduleInstances.forEach((instance) => {
                    instance.initialize();
                    if (this._settingsToViewInterfaceInitialization) {
                        instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
                        if (this._viewAtomsInitialization) {
                            instance.makeViewAtoms(this._viewAtomsInitialization);
                        }
                    }
                    if (this._viewToSettingsInterfaceInitialization) {
                        instance.makeViewToSettingsInterface(this._viewToSettingsInterfaceInitialization);
                        if (this._settingsAtomsInitialization) {
                            instance.makeSettingsAtoms(this._settingsAtomsInitialization);
                        }
                    }
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}
