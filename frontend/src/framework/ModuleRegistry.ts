import { ChannelDefinitions, SubscriberDefinitions } from "./DataChannelTypes";
import { Module } from "./Module";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    channels?: ChannelDefinitions;
    subscribers?: SubscriberDefinitions;

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

    static registerModule<TStateType extends StateBaseType>(
        options: RegisterModuleOptions
    ): Module<
        TStateType,
        typeof options.channels extends undefined ? never : Exclude<typeof options.channels, undefined>,
        typeof options.subscribers extends undefined ? never : Exclude<typeof options.subscribers, undefined>
    > {
        const module = new Module<
            TStateType,
            typeof options.channels extends undefined ? never : Exclude<typeof options.channels, undefined>,
            typeof options.subscribers extends undefined ? never : Exclude<typeof options.subscribers, undefined>
        >({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            channels: options.channels,
            subscribers: options.subscribers,
            drawPreviewFunc: options.preview,
            description: options.description,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<
        TStateType extends StateBaseType,
        TChannelDefs extends ChannelDefinitions | never = never,
        TSubscriberDefs extends SubscriberDefinitions | never = never
    >(
        moduleName: string,
        defaultState: TStateType,
        options?: StateOptions<TStateType>
    ): Module<TStateType, TChannelDefs, TSubscriberDefs> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            return module as Module<TStateType, TChannelDefs, TSubscriberDefs>;
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
