import { BroadcastChannelsDef, InputBroadcastChannelDef } from "./Broadcaster";
import { Module } from "./Module";
import { Channel, ChannelInput } from "./NewBroadcaster";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    outputChannels?: BroadcastChannelsDef;
    newChannels?: Channel[];
    newChannelInput?: ChannelInput[];
    inputChannels?: InputBroadcastChannelDef[];

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

    static registerModule<ModuleStateType extends StateBaseType>(
        options: RegisterModuleOptions
    ): Module<ModuleStateType> {
        const module = new Module<ModuleStateType>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            broadcastChannelsDef: options.outputChannels ?? {},
            inputChannelDefs: options.inputChannels ?? [],
            channels: options.newChannels ?? [],
            channelInputs: options.newChannelInput ?? [],
            drawPreviewFunc: options.preview,
            description: options.description,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        defaultState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            return module as Module<ModuleStateType>;
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
