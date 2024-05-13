import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { AtomsInitialization, Module } from "./Module";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceBaseType, InterfaceInitialization } from "./UniDirectionalSettingsToViewInterface";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions = {
    moduleName: string;
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
    private static _registeredModules: Record<string, Module<any, any, any, any>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any, any, any, any>> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerModule<
        TStateType extends StateBaseType,
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        },
        TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
        TViewAtomsType extends Record<string, unknown> = Record<string, never>
    >(options: RegisterModuleOptions): Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        const module = new Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
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
        TStateType extends StateBaseType,
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        },
        TSettingsAtomsType extends Record<string, unknown> = Record<string, never>,
        TViewAtomsType extends Record<string, unknown> = Record<string, never>
    >(
        moduleName: string,
        defaultState: TStateType,
        options?: StateOptions<TStateType>,
        interfaceInitialization?: InterfaceInitialization<TInterfaceType>,
        settingsAtomsInitialization?: AtomsInitialization<TSettingsAtomsType, TInterfaceType>,
        viewAtomsInitialization?: AtomsInitialization<TViewAtomsType, TInterfaceType>
    ): Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            if (interfaceInitialization) {
                module.setSettingsToViewInterfaceInitialization(interfaceInitialization);
            }
            if (settingsAtomsInitialization) {
                module.setSettingsAtomsInitialization(settingsAtomsInitialization);
            }
            if (viewAtomsInitialization) {
                module.setViewAtomsInitialization(viewAtomsInitialization);
            }
            return module as Module<TStateType, TInterfaceType, TSettingsAtomsType, TViewAtomsType>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any, any, any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any, any, any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any, any, any, any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any, any, any, any>;
    }

    static getRegisteredModules(): Record<string, Module<any, any, any, any>> {
        return this._registeredModules;
    }
}
