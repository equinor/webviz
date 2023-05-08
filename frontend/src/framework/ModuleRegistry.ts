import { BroadcastChannelMeta } from "./Broadcaster";
import { Module } from "./Module";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any, any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelMeta: BroadcastChannelMeta = {}
    ): Module<ModuleStateType, typeof broadcastChannelMeta> {
        const module = new Module<ModuleStateType, typeof broadcastChannelMeta>(
            moduleName,
            syncableSettingKeys,
            broadcastChannelMeta
        );
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static initModule<ModuleStateType extends StateBaseType, BCM extends BroadcastChannelMeta = {}>(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as Module<ModuleStateType, BCM>;
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
