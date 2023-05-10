import { BroadcastChannelsDef } from "./Broadcaster";
import { Module } from "./Module";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

/*
Extract<keyof typeof broadcastChannelsDef, string>,
            BroadcastChannelConvert<typeof broadcastChannelsDef>
            */

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any, any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelsDef: BroadcastChannelsDef | never = {}
    ): Module<ModuleStateType, typeof broadcastChannelsDef | never> {
        const module = new Module<ModuleStateType, typeof broadcastChannelsDef | never>(
            moduleName,
            syncableSettingKeys,
            broadcastChannelsDef
        );
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static initModule<ModuleStateType extends StateBaseType, BCD extends BroadcastChannelsDef = never>(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType, BCD> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as Module<ModuleStateType, BCD>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getModule(moduleName: string): Module<any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getRegisteredModules(): Record<string, Module<any, any>> {
        return this._registeredModules;
    }
}
