import React from "react";

import { Atom, PrimitiveAtom, WritableAtom } from "jotai";
import { cloneDeep } from "lodash";

import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { SettingsContext, ViewContext } from "./ModuleContext";
import { ModuleDataTagId } from "./ModuleDataTags";
import { ModuleInstance } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceBaseType,
    InterfaceInitialization,
    UniDirectionalSettingsToViewInterface,
} from "./UniDirectionalSettingsToViewInterface";
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

export type ModuleSettingsProps<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = {
    settingsContext: SettingsContext<TTStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleViewProps<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = {
    viewContext: ViewContext<TTStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleAtoms<TAtoms extends Record<string, unknown>> = {
    [K in keyof TAtoms]: Atom<TAtoms[K]> | WritableAtom<TAtoms[K], [TAtoms[K]], void> | PrimitiveAtom<TAtoms[K]>;
};

export type AtomsInitialization<TAtoms extends Record<string, unknown>, TInterfaceType extends InterfaceBaseType> = (
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<TInterfaceType>
) => ModuleAtoms<TAtoms>;

export type ModuleSettings<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = React.FC<ModuleSettingsProps<TTStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>>;

export type ModuleView<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
    TViewAtomsType extends Record<string, unknown> = Record<string, never>
> = React.FC<ModuleViewProps<TTStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>>;

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
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSettingsAtomsType extends Record<string, unknown>,
    TViewAtomsType extends Record<string, unknown>
> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    public settingsFC: ModuleSettings<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
    protected _importState: ImportState;
    private _moduleInstances: ModuleInstance<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>[];
    private _defaultState: TStateType | null;
    private _settingsToViewInterfaceInitialization: InterfaceInitialization<TInterfaceType> | null;
    private _settingsAtomsInitialization: AtomsInitialization<TSettingsAtomsType, TInterfaceType> | null;
    private _viewAtomsInitialization: AtomsInitialization<TViewAtomsType, TInterfaceType> | null;
    private _stateOptions: StateOptions<TStateType> | undefined;
    private _workbench: Workbench | null;
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
        this._importState = ImportState.NotImported;
        this._moduleInstances = [];
        this._defaultState = null;
        this._settingsToViewInterfaceInitialization = null;
        this._settingsAtomsInitialization = null;
        this._viewAtomsInitialization = null;
        this._workbench = null;
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

    setDefaultState(defaultState: TStateType, options?: StateOptions<TStateType>): void {
        this._defaultState = defaultState;
        this._stateOptions = options;
        this._moduleInstances.forEach((instance) => {
            if (this._defaultState && !instance.isInitialized()) {
                instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
            }
        });
    }

    setSettingsToViewInterfaceInitialization(interfaceInitialization: InterfaceInitialization<TInterfaceType>): void {
        this._settingsToViewInterfaceInitialization = interfaceInitialization;
    }

    setSettingsAtomsInitialization(atomsInitialization: AtomsInitialization<TSettingsAtomsType, TInterfaceType>): void {
        this._settingsAtomsInitialization = atomsInitialization;
    }

    setViewAtomsInitialization(atomsInitialization: AtomsInitialization<TViewAtomsType, TInterfaceType>): void {
        this._viewAtomsInitialization = atomsInitialization;
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(
        instanceNumber: number
    ): ModuleInstance<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>({
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
            instance.notifySubscribersAboutImportStateChange();
        });

        if (this._workbench && state === ImportState.Imported) {
            this._workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._defaultState && this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (instance.isInitialized()) {
                        return;
                    }
                    if (this._defaultState) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                    if (this._settingsToViewInterfaceInitialization) {
                        instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
                        if (this._settingsAtomsInitialization) {
                            instance.makeSettingsAtoms(this._settingsAtomsInitialization);
                        }
                        if (this._viewAtomsInitialization) {
                            instance.makeViewAtoms(this._viewAtomsInitialization);
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
                    if (this._defaultState) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                    if (this._settingsToViewInterfaceInitialization) {
                        instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
                        if (this._settingsAtomsInitialization) {
                            instance.makeSettingsAtoms(this._settingsAtomsInitialization);
                        }
                        if (this._viewAtomsInitialization) {
                            instance.makeViewAtoms(this._viewAtomsInitialization);
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
