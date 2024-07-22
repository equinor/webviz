import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { AtomsInitialization, Module, ModuleCategory, ModuleDevState } from "./Module";
import { ModuleDataTagId } from "./ModuleDataTags";
import { DrawPreviewFunc } from "./Preview";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceBaseType, InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";
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
    private static _registeredModules: Record<string, Module<any, any, any>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any, any, any>> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerModule<
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        },
        TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
        TViewAtomsType extends Record<string, unknown> = Record<string, never>
    >(options: RegisterModuleOptions): Module<TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        const module = new Module<TInterfaceType, TSettingsAtomsType, TViewAtomsType>({
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

    static initModule<
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        },
        TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
        TViewAtomsType extends Record<string, unknown> = Record<string, never>
    >(
        moduleName: string,
        interfaceInitialization?: InterfaceInitialization<TInterfaceType>,
        settingsAtomsInitialization?: AtomsInitialization<TSettingsAtomsType, TInterfaceType>,
        viewAtomsInitialization?: AtomsInitialization<TViewAtomsType, TInterfaceType>
    ): Module<TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            if (interfaceInitialization) {
                module.setSettingsToViewInterfaceInitialization(interfaceInitialization);
            }
            if (settingsAtomsInitialization) {
                module.setSettingsAtomsInitialization(settingsAtomsInitialization);
            }
            if (viewAtomsInitialization) {
                module.setViewAtomsInitialization(viewAtomsInitialization);
            }
            return module as Module<TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any, any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any, any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any, any, any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any, any, any>;
    }

    static getRegisteredModules(): Record<string, Module<any, any, any>> {
        return this._registeredModules;
    }
}
