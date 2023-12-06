import { ModuleChannelDefinition, ModuleChannelReceiverDefinition } from "./DataChannelTypes";
import { Module } from "./Module";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    channels?: ModuleChannelDefinition[];
    subscribers?: ModuleChannelReceiverDefinition[];

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

    static registerModule<TStateType extends StateBaseType>(options: RegisterModuleOptions): Module<TStateType> {
        const module = new Module<TStateType>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            channels: options.channels,
            receivers: options.subscribers,
            drawPreviewFunc: options.preview,
            description: options.description,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<TStateType extends StateBaseType>(
        moduleName: string,
        defaultState: TStateType,
        options?: StateOptions<TStateType>
    ): Module<TStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            return module as Module<TStateType>;
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
