import { Module } from "./Module";
import { StateBaseType } from "./StateStore";

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any>> = {};
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        initialState: ModuleStateType
    ): Module<ModuleStateType> {
        const module = new Module<ModuleStateType>(moduleName, initialState);
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static getModule<ModuleStateType extends StateBaseType>(moduleName: string): Module<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<ModuleStateType>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }
}
