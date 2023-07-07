import { BroadcastChannelsDef } from "./Broadcaster";
import { Module } from "./Module";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

export type RegisterModuleOptions = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    broadcastChannelsDef?: BroadcastChannelsDef;
};

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        options: RegisterModuleOptions
        broadcastChannelsDef: BroadcastChannelsDef = {},
        drawPreviewFunc: DrawPreviewFunc | null = null
    ): Module<ModuleStateType> {
        const module = new Module<ModuleStateType>(
            options.moduleName,
            options.defaultTitle,
            options.syncableSettingKeys,
            options.broadcastChannelsDef
            drawPreviewFunc
        );
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    public static initModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as Module<ModuleStateType>;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static getModule(moduleName: string): Module<any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any>;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static getRegisteredModules(): Record<string, Module<any>> {
        return this._registeredModules;
    }
}
