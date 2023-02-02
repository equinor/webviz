import { Module } from "./Module";


export class ModuleRegistry {
    private static _registeredModules: Module[] = [];

    private constructor() {
    }

    public static registerModule(moduleName: string): Module {
        const module = new Module(moduleName);
        this._registeredModules.push(module);
        return module;
    }

    public static getModule(moduleName: string) : Module {
        const module = this._registeredModules.find((m) => m.getName() === moduleName);
        if (module) {
            return module;
        }
        throw "Did you forget to register your module in 'src/modules/index.ts'?";
    }
}

