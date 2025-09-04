import type { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";
import type {
    InterfaceEffects,
    JTDBaseType,
    MakeReadonly,
    ModuleStateBaseSchema,
    ModuleCategory,
    ModuleDevState,
    ModuleInterfaceTypes,
    NoModuleStateSchema,
    OnInstanceUnloadFunc,
} from "./Module";
import { Module } from "./Module";
import type { ModuleDataTagId } from "./ModuleDataTags";
import type { DrawPreviewFunc } from "./Preview";
import type { SyncSettingKey } from "./SyncSettings";
import type { InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";

export type RegisterModuleOptions<TSerializedStateDef extends JTDBaseType = NoModuleStateSchema> = {
    moduleName: string;
    category: ModuleCategory;
    devState: ModuleDevState;
    dataTagIds?: ModuleDataTagId[];
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    channelDefinitions?: ChannelDefinition[];
    channelReceiverDefinitions?: ChannelReceiverDefinition[];
    preview?: DrawPreviewFunc;
    description?: string;
    onInstanceUnload?: OnInstanceUnloadFunc;
    serializedStateSchema?: MakeReadonly<TSerializedStateDef>;
};

export class ModuleNotFoundError extends Error {
    readonly moduleName: string;
    constructor(moduleName: string) {
        super(
            `Module '${moduleName}' not found. Did you forget to register your module in 'src/modules/registerAllModules.ts'?`,
        );
        this.moduleName = moduleName;
    }
}

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any, any>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any, any>> = {};

    private constructor() {}

    static registerModule<
        TInterfaceTypes extends ModuleInterfaceTypes,
        TSerializedStateDef extends ModuleStateBaseSchema = NoModuleStateSchema,
    >(options: RegisterModuleOptions<TSerializedStateDef>): Module<TInterfaceTypes, TSerializedStateDef> {
        const module = new Module<TInterfaceTypes, TSerializedStateDef>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            category: options.category,
            devState: options.devState,
            dataTagIds: options.dataTagIds,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            channelDefinitions: options.channelDefinitions,
            channelReceiverDefinitions: options.channelReceiverDefinitions,
            drawPreviewFunc: options.preview,
            onInstanceUnloadFunc: options.onInstanceUnload,
            description: options.description,
            serializedStateSchema: options.serializedStateSchema,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<
        TInterfaceTypes extends ModuleInterfaceTypes,
        TSerializedStateDef extends ModuleStateBaseSchema = NoModuleStateSchema,
    >(
        moduleName: string,
        options: {
            settingsToViewInterfaceInitialization?: TInterfaceTypes["settingsToView"] extends undefined
                ? undefined
                : InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>;
            viewToSettingsInterfaceInitialization?: TInterfaceTypes["viewToSettings"] extends undefined
                ? undefined
                : InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>;
            viewToSettingsInterfaceEffects?: InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>>;
            settingsToViewInterfaceEffects?: InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>>;
        },
    ): Module<TInterfaceTypes, TSerializedStateDef> {
        const module = this._registeredModules[moduleName];
        if (module) {
            if (options.settingsToViewInterfaceInitialization) {
                module.setSettingsToViewInterfaceInitialization(options.settingsToViewInterfaceInitialization);
            }
            if (options.viewToSettingsInterfaceInitialization) {
                module.setViewToSettingsInterfaceInitialization(options.viewToSettingsInterfaceInitialization);
            }
            if (options.viewToSettingsInterfaceEffects) {
                module.setViewToSettingsInterfaceEffects(options.viewToSettingsInterfaceEffects);
            }
            if (options.settingsToViewInterfaceEffects) {
                module.setSettingsToViewInterfaceEffects(options.settingsToViewInterfaceEffects);
            }
            return module as Module<TInterfaceTypes, TSerializedStateDef>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any, any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any, any>;
    }

    static getRegisteredModules(): Record<string, Module<any, any>> {
        return this._registeredModules;
    }
}
