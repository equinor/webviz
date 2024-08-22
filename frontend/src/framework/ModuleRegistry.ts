import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InterfaceEffects, Module, ModuleCategory, ModuleDevState, ModuleInterfaceTypes } from "./Module";
import { ModuleDataTagId } from "./ModuleDataTags";
import { DrawPreviewFunc } from "./Preview";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions = {
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
};

export class ModuleNotFoundError extends Error {
    readonly moduleName: string;
    constructor(moduleName: string) {
        super(
            `Module '${moduleName}' not found. Did you forget to register your module in 'src/modules/registerAllModules.ts'?`
        );
        this.moduleName = moduleName;
    }
}

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any>> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerModule<TInterfaceTypes extends ModuleInterfaceTypes>(
        options: RegisterModuleOptions
    ): Module<TInterfaceTypes> {
        const module = new Module<TInterfaceTypes>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            category: options.category,
            devState: options.devState,
            dataTagIds: options.dataTagIds,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            channelDefinitions: options.channelDefinitions,
            channelReceiverDefinitions: options.channelReceiverDefinitions,
            drawPreviewFunc: options.preview,
            description: options.description,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<TInterfaceTypes extends ModuleInterfaceTypes>(
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
        }
    ): Module<TInterfaceTypes> {
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
            return module as Module<TInterfaceTypes>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any>;
    }

    static getRegisteredModules(): Record<string, Module<any>> {
        return this._registeredModules;
    }
}
