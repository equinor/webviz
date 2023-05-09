import { BroadcastChannelMeta } from "./Broadcaster";
import { Module } from "./Module";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any, any, any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<
        ModuleStateType extends StateBaseType,
        ChannelNames extends string = never,
        BCM extends BroadcastChannelMeta<ChannelNames> = never
    >(
        moduleName: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelNames: ChannelNames[] = []
    ): Module<ModuleStateType, ChannelNames, BCM> {
        const module = new Module<ModuleStateType, ChannelNames, BCM>(
            moduleName,
            syncableSettingKeys,
            broadcastChannelNames
        );
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static initModule<
        ModuleStateType extends StateBaseType,
        ChannelNames extends string = never,
        BCM extends BroadcastChannelMeta<ChannelNames> = never
    >(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType, ChannelNames, BCM> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as Module<ModuleStateType, ChannelNames, BCM>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getModule(moduleName: string): Module<any, any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any, any>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getRegisteredModules(): Record<string, Module<any, any, any>> {
        return this._registeredModules;
    }
}
