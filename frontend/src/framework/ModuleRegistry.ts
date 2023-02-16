import { Module } from "./Module";
import { StateBaseType } from "./StateStore";

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(moduleName: string): Module<ModuleStateType> {
        const module = new Module<ModuleStateType>(moduleName);
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static initModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        initialState: ModuleStateType
    ): Module<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState);
            return module as Module<ModuleStateType>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getModule(moduleName: string): Module<any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any>;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }

    public static getRegisteredModules(): Record<string, Module<any>> {
        return this._registeredModules;
    }
}
