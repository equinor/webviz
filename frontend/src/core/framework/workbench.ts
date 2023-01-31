import { Module, ModuleInstance, ModulePlaceholder } from "./module";

let workbenchInstance: Workbench | undefined;

class Workbench {
    private registeredModules: Module[];
    private moduleInstances: ModuleInstance[];
    private _activeModuleId: string;
    private _importedModules: string[];
    private _loadingModules: string[];
    private layout: string[];

    constructor() {
        this.registeredModules = [];
        this.moduleInstances = [];
        this._importedModules = [];
        this._activeModuleId = "";
        this._loadingModules = [];
        this.layout = [];

        if (workbenchInstance) {
            throw new Error("Workbench already exists");
        }

        workbenchInstance = this;
    }

    public get activeModuleId(): string {
        return this._activeModuleId;
    }

    public getModuleInstances(): ModuleInstance[] {
        return this.moduleInstances;
    }

    public registerModule(name: string): Module {
        const module = new Module(name);
        this.registeredModules.push(module);
        return module;
    }

    public makeLayout(layout: string[]): void {
        layout.forEach((moduleName) => {
            this.addModule(moduleName);
        });

        if (this.moduleInstances.length > 0) {
            this._activeModuleId = this.moduleInstances[0].id;
        }
    }

    public addModule(moduleName: string): void {
        const addModuleInstance = () => {
            const module = this.registeredModules.find(
                (m) => m.name === moduleName
            );
            if (module) {
                const index = this.moduleInstances.findIndex(
                    (m) => m.id === moduleName
                );
                if (index) {
                    this.moduleInstances[index] = module.makeInstance();
                    return;
                }
                this.moduleInstances.push(module.makeInstance());
                return;
            }
            throw new Error(`Module ${moduleName} not found`);
        };

        if (this._importedModules.includes(moduleName)) {
            addModuleInstance();
            return;
        }

        this._loadingModules.push(moduleName);
        this.moduleInstances.push({
            id: moduleName,
            name: moduleName,
            loading: true,
        });

        import(`/src/modules/${moduleName}/index.tsx`)
            .then(() => {
                this._importedModules.push(moduleName);
                this._loadingModules = this._loadingModules.filter(
                    (el) => el !== moduleName
                );
                addModuleInstance();
            })
            .catch((err) => {
                this._loadingModules = this._loadingModules.filter(
                    (el) => el !== moduleName
                );
                throw new Error(`Module ${moduleName} not found`);
            });
    }
}

const workbench = new Workbench();
export { workbench };
