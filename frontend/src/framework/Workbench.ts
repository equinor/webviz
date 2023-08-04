import { CategoricalColorPalette, ColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";
import { QueryClient } from "@tanstack/react-query";

import { Broadcaster } from "./Broadcaster";
import { EnsembleIdent } from "./EnsembleIdent";
import { InitialSettings } from "./InitialSettings";
import { ImportState } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleRegistry } from "./ModuleRegistry";
import { StateStore } from "./StateStore";
import { Template } from "./TemplateRegistry";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { WorkbenchSettings } from "./WorkbenchSettings";
import { loadEnsembleSetMetadataFromBackend } from "./internal/EnsembleSetLoader";
import { PrivateWorkbenchServices } from "./internal/PrivateWorkbenchServices";
import { WorkbenchSessionPrivate } from "./internal/WorkbenchSessionPrivate";

export enum WorkbenchEvents {
    ActiveModuleChanged = "ActiveModuleChanged",
    ModuleInstancesChanged = "ModuleInstancesChanged",
    FullModuleRerenderRequested = "FullModuleRerenderRequested",
    ColorPalettesChanged = "ColorPalettesChanged",
}

export enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
};

export type WorkbenchGuiState = {
    drawerContent: DrawerContent;
    settingsPanelWidthInPercent: number;
};

export enum ColorType {
    Set = "set",
    Categorical = "categorical",
    Sequential = "sequential",
    Diverging = "diverging",
}

const defaultSetColorPalette = new CategoricalColorPalette("Default", [
    "#ea5545",
    "#f46a9b",
    "#ef9b20",
    "#edbf33",
    "#ede15b",
    "#bdcf32",
    "#87bc45",
    "#27aeef",
    "#b33dc6",
]);

const defaultCategoricalColorPalette = new CategoricalColorPalette("Default", [
    "#ea5545",
    "#f46a9b",
    "#ef9b20",
    "#edbf33",
    "#ede15b",
    "#bdcf32",
    "#87bc45",
    "#27aeef",
    "#b33dc6",
]);

const defaultSequentialColorPalette = new ContinuousColorPalette("Default", [
    {
        hexColor: "#115f9a",
        position: 0,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#1984c5",
        position: 0.125,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#22a7f0",
        position: 0.25,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#48b5c4",
        position: 0.375,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#76c68f",
        position: 0.5,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#a6d75b",
        position: 0.625,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#c9e52f",
        position: 0.75,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#d0ee11",
        position: 0.875,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#d0f400",
        position: 1,
        midPointPosition: 0.5,
    },
]);

const defaultDivergingColorPalette = new ContinuousColorPalette("Berlin", [
    {
        hexColor: "#b9c6ff",
        position: 0,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#2f799d",
        position: 0.25,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#150e0d",
        position: 0.5,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#944834",
        position: 0.75,
        midPointPosition: 0.5,
    },
    {
        hexColor: "#ffeded",
        position: 1,
        midPointPosition: 0.5,
    },
]);

export class Workbench {
    private _moduleInstances: ModuleInstance<any>[];
    private _activeModuleId: string;
    private _guiStateStore: StateStore<WorkbenchGuiState>;
    private _workbenchSession: WorkbenchSessionPrivate;
    private _workbenchServices: PrivateWorkbenchServices;
    private _workbenchSettings: WorkbenchSettings;
    private _broadcaster: Broadcaster;
    private _subscribersMap: { [key: string]: Set<() => void> };
    private _layout: LayoutElement[];
    private _colorPalettes: { [key: string]: ColorPalette[] };
    private _selectedColorPalettes: Record<ColorType, string>;

    constructor() {
        this._moduleInstances = [];
        this._activeModuleId = "";
        this._guiStateStore = new StateStore<WorkbenchGuiState>({
            drawerContent: DrawerContent.ModuleSettings,
            settingsPanelWidthInPercent: parseFloat(localStorage.getItem("settingsPanelWidthInPercent") || "20"),
        });
        this._workbenchSession = new WorkbenchSessionPrivate();
        this._workbenchServices = new PrivateWorkbenchServices(this);
        this._workbenchSettings = new WorkbenchSettings(this);
        this._broadcaster = new Broadcaster();
        this._subscribersMap = {};
        this._layout = [];
        this._colorPalettes = {
            [ColorType.Set]: [defaultSetColorPalette],
            [ColorType.Categorical]: [defaultCategoricalColorPalette],
            [ColorType.Sequential]: [defaultSequentialColorPalette],
            [ColorType.Diverging]: [defaultDivergingColorPalette],
        };
        this._selectedColorPalettes = {
            [ColorType.Set]: defaultSetColorPalette.getUuid(),
            [ColorType.Categorical]: defaultCategoricalColorPalette.getUuid(),
            [ColorType.Sequential]: defaultSequentialColorPalette.getUuid(),
            [ColorType.Diverging]: defaultDivergingColorPalette.getUuid(),
        };

        this.loadColorPalettesFromLocalStorage();
        this.loadSelectedColorPalettesUUidsFromLocalStorage();
    }

    private loadColorPalettesFromLocalStorage(): void {
        const colorPalettesString = localStorage.getItem("colorPalettes");
        if (!colorPalettesString) return;

        const colorPalettes = JSON.parse(colorPalettesString);
        if (!colorPalettes) return;

        if (colorPalettes instanceof Object) {
            if (colorPalettes[ColorType.Set] && colorPalettes[ColorType.Set] instanceof Array) {
                this._colorPalettes[ColorType.Set] = colorPalettes[ColorType.Set].map((el: string) => {
                    return CategoricalColorPalette.fromJson(el);
                });
            }
            if (colorPalettes[ColorType.Categorical] && colorPalettes[ColorType.Categorical] instanceof Array) {
                this._colorPalettes[ColorType.Categorical] = colorPalettes[ColorType.Categorical].map((el: string) => {
                    return CategoricalColorPalette.fromJson(el);
                });
            }

            if (colorPalettes[ColorType.Sequential] && colorPalettes[ColorType.Sequential] instanceof Array) {
                this._colorPalettes[ColorType.Sequential] = colorPalettes[ColorType.Sequential].map((el: string) => {
                    return ContinuousColorPalette.fromJson(el);
                });
            }

            if (colorPalettes[ColorType.Diverging] && colorPalettes[ColorType.Diverging] instanceof Array) {
                this._colorPalettes[ColorType.Diverging] = colorPalettes[ColorType.Diverging].map((el: string) => {
                    return ContinuousColorPalette.fromJson(el);
                });
            }
        }
    }

    private loadSelectedColorPalettesUUidsFromLocalStorage(): void {
        const selectedColorPalettesString = localStorage.getItem("selectedColorPalettes");
        if (!selectedColorPalettesString) return;

        const selectedColorPalettes = JSON.parse(selectedColorPalettesString);
        if (!selectedColorPalettes) return;

        if (selectedColorPalettes instanceof Object) {
            if (selectedColorPalettes[ColorType.Set]) {
                this._selectedColorPalettes[ColorType.Set] = selectedColorPalettes[ColorType.Set];
            }
            if (selectedColorPalettes[ColorType.Categorical]) {
                this._selectedColorPalettes[ColorType.Categorical] = selectedColorPalettes[ColorType.Categorical];
            }
            if (selectedColorPalettes[ColorType.Sequential]) {
                this._selectedColorPalettes[ColorType.Sequential] = selectedColorPalettes[ColorType.Sequential];
            }
            if (selectedColorPalettes[ColorType.Diverging]) {
                this._selectedColorPalettes[ColorType.Diverging] = selectedColorPalettes[ColorType.Diverging];
            }
        }
    }

    private storeColorPalettesToLocalStorage(): void {
        const colorPalettes = {
            [ColorType.Set]: this._colorPalettes[ColorType.Set].map((el) => (el as CategoricalColorPalette).toJson()),
            [ColorType.Categorical]: this._colorPalettes[ColorType.Categorical].map((el) =>
                (el as CategoricalColorPalette).toJson()
            ),
            [ColorType.Sequential]: this._colorPalettes[ColorType.Sequential].map((el) =>
                (el as ContinuousColorPalette).toJson()
            ),
            [ColorType.Diverging]: this._colorPalettes[ColorType.Diverging].map((el) =>
                (el as ContinuousColorPalette).toJson()
            ),
        };

        localStorage.setItem("colorPalettes", JSON.stringify(colorPalettes));
    }

    private storeSelectedColorPalettesUUidsToLocalStorage(): void {
        const selectedColorPalettes = {
            [ColorType.Set]: this._selectedColorPalettes[ColorType.Set],
            [ColorType.Categorical]: this._selectedColorPalettes[ColorType.Categorical],
            [ColorType.Sequential]: this._selectedColorPalettes[ColorType.Sequential],
            [ColorType.Diverging]: this._selectedColorPalettes[ColorType.Diverging],
        };

        localStorage.setItem("selectedColorPalettes", JSON.stringify(selectedColorPalettes));
    }

    addColorPalette(colorPalette: ColorPalette, type: ColorType): void {
        this._colorPalettes[type].push(colorPalette);
        this.notifySubscribers(WorkbenchEvents.ColorPalettesChanged);
        this.storeColorPalettesToLocalStorage();
        this.storeSelectedColorPalettesUUidsToLocalStorage();
    }

    getColorPalettes(): { [key: string]: ColorPalette[] } {
        return this._colorPalettes;
    }

    setColorPalettes(colorPalettes: ColorPalette[], type: ColorType): void {
        this._colorPalettes[type] = colorPalettes;
        this.notifySubscribers(WorkbenchEvents.ColorPalettesChanged);
        this.storeColorPalettesToLocalStorage();
        this.storeSelectedColorPalettesUUidsToLocalStorage();
    }

    setSelectedColorPalette(uuid: string, type: ColorType): void {
        this._selectedColorPalettes[type] = uuid;
        this.notifySubscribers(WorkbenchEvents.ColorPalettesChanged);
        this.storeSelectedColorPalettesUUidsToLocalStorage();
    }

    getSelectedColorPaletteUuid(type: ColorType): string {
        return this._selectedColorPalettes[type];
    }

    getSelectedColorPalette(type: ColorType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getUuid() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    loadLayoutFromLocalStorage(): boolean {
        const layoutString = localStorage.getItem("layout");
        if (!layoutString) return false;

        const layout = JSON.parse(layoutString) as LayoutElement[];
        this.makeLayout(layout);
        return true;
    }

    getGuiStateStore(): StateStore<WorkbenchGuiState> {
        return this._guiStateStore;
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getWorkbenchSettings(): WorkbenchSettings {
        return this._workbenchSettings;
    }

    getBroadcaster(): Broadcaster {
        return this._broadcaster;
    }

    getActiveModuleId(): string {
        return this._activeModuleId;
    }

    getActiveModuleName(): string {
        return (
            this._moduleInstances
                .find((moduleInstance) => moduleInstance.getId() === this._activeModuleId)
                ?.getTitle() || ""
        );
    }

    setActiveModuleId(id: string) {
        this._activeModuleId = id;
        this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
    }

    private notifySubscribers(event: WorkbenchEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    subscribe(event: WorkbenchEvents, cb: () => void) {
        const subscribersSet = this._subscribersMap[event] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[event] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }

    getModuleInstances(): ModuleInstance<any>[] {
        return this._moduleInstances;
    }

    getModuleInstance(id: string): ModuleInstance<any> | undefined {
        return this._moduleInstances.find((moduleInstance) => moduleInstance.getId() === id);
    }

    makeLayout(layout: LayoutElement[]): void {
        this._moduleInstances = [];
        this.setLayout(layout);
        layout.forEach((element, index: number) => {
            const module = ModuleRegistry.getModule(element.moduleName);
            if (!module) {
                throw new Error(`Module ${element.moduleName} not found`);
            }

            module.setWorkbench(this);
            const moduleInstance = module.makeInstance();
            this._moduleInstances.push(moduleInstance);
            this._layout[index] = { ...this._layout[index], moduleInstanceId: moduleInstance.getId() };
            this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        });
    }

    private clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            this._broadcaster.unregisterAllChannelsForModuleInstance(moduleInstance.getId());
        }
        this._moduleInstances = [];
        this.setLayout([]);
    }

    makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): ModuleInstance<any> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        module.setWorkbench(this);

        const moduleInstance = module.makeInstance();
        this._moduleInstances.push(moduleInstance);

        this._layout.push({ ...layout, moduleInstanceId: moduleInstance.getId() });
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
        this._activeModuleId = moduleInstance.getId();
        this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        this._broadcaster.unregisterAllChannelsForModuleInstance(moduleInstanceId);
        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        if (this._activeModuleId === moduleInstanceId) {
            this._activeModuleId = "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
        this.notifySubscribers(WorkbenchEvents.FullModuleRerenderRequested);

        const modifiedLayout = layout.map((el) => {
            return { ...el, moduleInstanceId: undefined };
        });
        localStorage.setItem("layout", JSON.stringify(modifiedLayout));
    }

    maybeMakeFirstModuleInstanceActive(): void {
        if (!this._moduleInstances.some((el) => el.getId() === this._activeModuleId)) {
            this._activeModuleId =
                this._moduleInstances
                    .filter((el) => el.getImportState() === ImportState.Imported)
                    .at(0)
                    ?.getId() || "";
            this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
        }
    }

    async loadAndSetupEnsembleSetInSession(
        queryClient: QueryClient,
        specifiedEnsembleIdents: EnsembleIdent[]
    ): Promise<void> {
        const ensembleIdentsToLoad: EnsembleIdent[] = [];
        for (const ensSpec of specifiedEnsembleIdents) {
            ensembleIdentsToLoad.push(new EnsembleIdent(ensSpec.getCaseUuid(), ensSpec.getEnsembleName()));
        }

        console.debug("loadAndSetupEnsembleSetInSession - starting load");
        const newEnsembleSet = await loadEnsembleSetMetadataFromBackend(queryClient, ensembleIdentsToLoad);
        console.debug("loadAndSetupEnsembleSetInSession - loading done");

        console.debug("loadAndSetupEnsembleSetInSession - publishing");
        return this._workbenchSession.setEnsembleSet(newEnsembleSet);
    }

    applyTemplate(template: Template): void {
        this.clearLayout();

        const newLayout = template.moduleInstances.map((el) => {
            return { ...el.layout, moduleName: el.moduleName };
        });

        this.makeLayout(newLayout);

        for (let i = 0; i < this._moduleInstances.length; i++) {
            const moduleInstance = this._moduleInstances[i];
            const templateModule = template.moduleInstances[i];
            if (templateModule.syncedSettings) {
                for (const syncSettingKey of templateModule.syncedSettings) {
                    moduleInstance.addSyncedSetting(syncSettingKey);
                }
            }

            const initialSettings: Record<string, unknown> = templateModule.initialSettings || {};

            if (templateModule.dataChannelsToInitialSettingsMapping) {
                for (const propName of Object.keys(templateModule.dataChannelsToInitialSettingsMapping)) {
                    const dataChannel = templateModule.dataChannelsToInitialSettingsMapping[propName];

                    const moduleInstanceIndex = template.moduleInstances.findIndex(
                        (el) => el.instanceRef === dataChannel.listensToInstanceRef
                    );
                    if (moduleInstanceIndex === -1) {
                        throw new Error("Could not find module instance for data channel");
                    }

                    const listensToModuleInstance = this._moduleInstances[moduleInstanceIndex];
                    const channel = listensToModuleInstance.getContext().getChannel(dataChannel.channelName);
                    if (!channel) {
                        throw new Error("Could not find channel");
                    }

                    initialSettings[propName] = channel.getName();
                }
            }

            moduleInstance.setInitialSettings(new InitialSettings(initialSettings));

            if (i === 0) {
                this._activeModuleId = moduleInstance.getId();
                this.notifySubscribers(WorkbenchEvents.ActiveModuleChanged);
            }
        }

        this.notifySubscribers(WorkbenchEvents.ModuleInstancesChanged);
    }
}
