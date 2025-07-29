import type { JTDSchemaType } from "ajv/dist/core";
import { v4 } from "uuid";

import { SyncSettingKey } from "@framework/SyncSettings";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { AtomStoreMaster } from "../../AtomStoreMaster";
import type { ModuleInstance, ModuleInstanceSerializedState } from "../../ModuleInstance";
import { ModuleRegistry } from "../../ModuleRegistry";
import type { Template } from "@framework/TemplateRegistry";

export type LayoutElement = {
    moduleInstanceId?: string;
    moduleName: string;
    relX: number;
    relY: number;
    relHeight: number;
    relWidth: number;
    minimized?: boolean;
    maximized?: boolean;
};

export type ModuleInstanceStateAndLayoutInfo = ModuleInstanceSerializedState & {
    layoutInfo: Omit<LayoutElement, "moduleInstanceId" | "moduleName">;
};

export type SerializedDashboard = {
    id: string;
    name: string;
    description?: string;
    activeModuleInstanceId: string | null;
    moduleInstances: ModuleInstanceStateAndLayoutInfo[];
};

const layoutElementSchema: JTDSchemaType<Omit<LayoutElement, "moduleInstanceId" | "moduleName">> = {
    properties: {
        relX: { type: "float32" },
        relY: { type: "float32" },
        relHeight: { type: "float32" },
        relWidth: { type: "float32" },
    },
    optionalProperties: {
        minimized: { type: "boolean" },
        maximized: { type: "boolean" },
    },
} as const;

const moduleInstanceSchema: JTDSchemaType<ModuleInstanceStateAndLayoutInfo> = {
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        serializedState: {
            optionalProperties: {
                view: { type: "string" },
                settings: { type: "string" },
            },
            nullable: true,
        },
        syncedSettingKeys: {
            elements: {
                enum: [SyncSettingKey.CAMERA_POSITION_INTERSECTION],
            },
        },
        dataChannelReceiverSubscriptions: {
            elements: {
                properties: {
                    idString: { type: "string" },
                    listensToModuleInstanceId: { type: "string" },
                    channelIdString: { type: "string" },
                    contentIdStrings: {
                        elements: { type: "string" },
                    },
                },
            },
        },
        layoutInfo: layoutElementSchema,
    },
} as const;

export const DASHBOARD_JTD_SCHEMA: JTDSchemaType<SerializedDashboard> = {
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        activeModuleInstanceId: { type: "string", nullable: true },
        moduleInstances: {
            elements: moduleInstanceSchema,
        },
    },
    optionalProperties: {
        description: { type: "string" },
    },
} as const;

export enum DashboardTopic {
    Layout = "Layout",
    ModuleInstances = "ModuleInstances",
    ActiveModuleInstanceId = "ActiveModuleInstanceId",
}

export type DashboardTopicPayloads = {
    [DashboardTopic.Layout]: LayoutElement[];
    [DashboardTopic.ModuleInstances]: ModuleInstance<any, any>[];
    [DashboardTopic.ActiveModuleInstanceId]: string | null;
};

export class Dashboard implements PublishSubscribe<DashboardTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<DashboardTopicPayloads>();

    private _id: string;
    private _name: string;
    private _description?: string;
    private _layout: LayoutElement[] = [];
    private _moduleInstances: ModuleInstance<any, any>[] = [];
    private _activeModuleInstanceId: string | null = null;
    private _atomStoreMaster: AtomStoreMaster;

    constructor(atomStoreMaster: AtomStoreMaster) {
        this._id = v4();
        this._name = "New Dashboard";
        this._atomStoreMaster = atomStoreMaster;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DashboardTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends DashboardTopic>(topic: T): () => DashboardTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === DashboardTopic.Layout) {
                return this._layout;
            }
            if (topic === DashboardTopic.ModuleInstances) {
                return this._moduleInstances;
            }
            if (topic === DashboardTopic.ActiveModuleInstanceId) {
                return this._activeModuleInstanceId;
            }

            throw new Error(`No snapshot getter for topic ${topic}`);
        };

        return snapshotGetter;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    getLayout(): LayoutElement[] {
        return this._layout;
    }

    setLayout(layout: LayoutElement[]): void {
        this._layout = layout;
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.Layout);
    }

    getModuleInstances(): ModuleInstance<any, any>[] {
        return this._moduleInstances;
    }

    serializeState(): SerializedDashboard {
        const moduleInstances = this._moduleInstances.map((moduleInstance) => {
            const moduleState = moduleInstance.serialize();

            const layoutInfo = this._layout.find((el) => el.moduleInstanceId === moduleInstance.getId());

            if (!layoutInfo) {
                throw new Error(`Layout info for module instance ${moduleInstance.getId()} not found`);
            }

            return {
                ...moduleState,
                layoutInfo: {
                    relX: layoutInfo.relX,
                    relY: layoutInfo.relY,
                    relHeight: layoutInfo.relHeight,
                    relWidth: layoutInfo.relWidth,
                    minimized: layoutInfo.minimized ?? false,
                    maximized: layoutInfo.maximized ?? false,
                },
            };
        });

        return {
            id: this._id,
            name: this._name,
            description: this._description,
            activeModuleInstanceId: this._activeModuleInstanceId,
            moduleInstances,
        };
    }

    async deserializeState(serializedDashboard: SerializedDashboard): Promise<void> {
        this._id = serializedDashboard.id;
        this._name = serializedDashboard.name;
        this._description = serializedDashboard.description;

        this.clearLayout();

        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { id, name, layoutInfo } = serializedInstance;

            const module = ModuleRegistry.getModule(name);
            if (!module) {
                throw new Error(`Module ${name} not found`);
            }
            const moduleInstance = await module.makeInstance(id, this._atomStoreMaster);
            this.registerModuleInstance(moduleInstance);
            moduleInstance.initiateDeserialization(serializedInstance);

            this._layout.push({
                moduleInstanceId: id,
                moduleName: name,
                relX: layoutInfo.relX,
                relY: layoutInfo.relY,
                relHeight: layoutInfo.relHeight,
                relWidth: layoutInfo.relWidth,
                minimized: layoutInfo.minimized,
                maximized: layoutInfo.maximized,
            });
        }

        this.setActiveModuleInstanceId(serializedDashboard.activeModuleInstanceId);

        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.Layout);
    }

    clearLayout(): void {
        for (const moduleInstance of this._moduleInstances) {
            moduleInstance.beforeDestroy();
        }
        this._moduleInstances = [];
        this._layout = [];
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.Layout);
    }

    registerModuleInstance(moduleInstance: ModuleInstance<any, any>): void {
        this._moduleInstances = [...this._moduleInstances, moduleInstance];
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.ModuleInstances);
    }

    async makeAndAddModuleInstance(moduleName: string, layout: LayoutElement): Promise<ModuleInstance<any, any>> {
        const module = ModuleRegistry.getModule(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        const id = v4();
        this._atomStoreMaster.makeAtomStoreForModuleInstance(id);
        const moduleInstance = await module.makeInstance(id, this._atomStoreMaster);
        this._moduleInstances = [...this._moduleInstances, moduleInstance];

        this._layout = [...this._layout, { ...layout, moduleInstanceId: moduleInstance.getId() }];
        this._activeModuleInstanceId = moduleInstance.getId();
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.ModuleInstances);
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.Layout);
        return moduleInstance;
    }

    removeModuleInstance(moduleInstanceId: string): void {
        const moduleInstance = this.getModuleInstance(moduleInstanceId);

        if (moduleInstance) {
            const manager = moduleInstance.getChannelManager();

            moduleInstance.unload();
            manager.unregisterAllChannels();
            manager.unregisterAllReceivers();
        }

        this._moduleInstances = this._moduleInstances.filter((el) => el.getId() !== moduleInstanceId);

        this._atomStoreMaster.removeAtomStoreForModuleInstance(moduleInstanceId);

        const newLayout = this._layout.filter((el) => el.moduleInstanceId !== moduleInstanceId);
        this.setLayout(newLayout);
        if (this._activeModuleInstanceId === moduleInstanceId) {
            this._activeModuleInstanceId = null;
        }
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.ModuleInstances);
    }

    getModuleInstance(id: string): ModuleInstance<any, any> | undefined {
        return this._moduleInstances.find((moduleInstance) => moduleInstance.getId() === id);
    }

    setActiveModuleInstanceId(moduleInstanceId: string | null): void {
        if (moduleInstanceId !== null && !this.getModuleInstance(moduleInstanceId)) {
            throw new Error(`Module instance with ID ${moduleInstanceId} not found`);
        }
        this._activeModuleInstanceId = moduleInstanceId;
        this._publishSubscribeDelegate.notifySubscribers(DashboardTopic.ActiveModuleInstanceId);
    }

    getActiveModuleInstanceId(): string | null {
        return this._activeModuleInstanceId;
    }

    static async fromPersistedState(
        serializedDashboard: SerializedDashboard,
        atomStoreMaster: AtomStoreMaster,
    ): Promise<Dashboard> {
        const dashboard = new Dashboard(atomStoreMaster);
        dashboard._id = serializedDashboard.id;
        dashboard._name = serializedDashboard.name;
        dashboard._description = serializedDashboard.description;

        const layout: LayoutElement[] = [];

        for (const serializedInstance of serializedDashboard.moduleInstances) {
            const { id, name, layoutInfo } = serializedInstance;

            const module = ModuleRegistry.getModule(name);
            if (!module) {
                throw new Error(`Module ${name} not found`);
            }
            const moduleInstance = await module.makeInstance(id, atomStoreMaster);
            dashboard.registerModuleInstance(moduleInstance);
            moduleInstance.initiateDeserialization(serializedInstance);

            layout.push({
                moduleInstanceId: id,
                moduleName: name,
                relX: layoutInfo.relX,
                relY: layoutInfo.relY,
                relHeight: layoutInfo.relHeight,
                relWidth: layoutInfo.relWidth,
                minimized: layoutInfo.minimized,
                maximized: layoutInfo.maximized,
            });
        }

        dashboard.setLayout(layout);

        return dashboard;
    }

    static async fromTemplate(template: Template, atomStoreMaster: AtomStoreMaster): Promise<Dashboard> {
        const dashboard = new Dashboard(atomStoreMaster);
        dashboard._id = v4();
        dashboard._description = template.description;

        const layout: LayoutElement[] = [];

        for (const module of template.moduleInstances) {
            const localLayout: LayoutElement = {
                moduleName: module.moduleName,
                relX: module.layout.relX,
                relY: module.layout.relY,
                relHeight: module.layout.relHeight,
                relWidth: module.layout.relWidth,
                minimized: module.layout.minimized,
                maximized: module.layout.maximized,
            };

            const moduleInstance = await dashboard.makeAndAddModuleInstance(module.moduleName, localLayout);
            layout.push({
                moduleInstanceId: moduleInstance.getId(),
                moduleName: module.moduleName,
                relX: module.layout.relX,
                relY: module.layout.relY,
                relHeight: module.layout.relHeight,
                relWidth: module.layout.relWidth,
                minimized: module.layout.minimized,
                maximized: module.layout.maximized,
            });
        }

        dashboard.setLayout(layout);

        return dashboard;
    }
}
