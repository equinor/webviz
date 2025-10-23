import type { ModuleSerializedStateMap } from "@modules/ModuleSerializedStateMap";

import type { KeyKind } from "./DataChannelTypes";
import type { LayoutElement } from "./internal/Dashboard";
import type { SyncSettingKey } from "./SyncSettings";

export type DataChannelTemplate = {
    listensToInstanceRef: string;
    kindOfKey: KeyKind;
    channelIdString: string;
};

export type TemplateLayoutElement = Omit<LayoutElement, "moduleInstanceId" | "moduleName">;

export type TemplateModuleInstance<M extends keyof ModuleSerializedStateMap = keyof ModuleSerializedStateMap> = {
    instanceRef?: string;
    moduleName: M;
    layout: TemplateLayoutElement;
    syncedSettings?: SyncSettingKey[];
    dataChannelsToInitialSettingsMapping?: Record<string, DataChannelTemplate>;
    initialState?: {
        settings?: ModuleSerializedStateMap[M]["settings"];
        view?: ModuleSerializedStateMap[M]["view"];
    };
};

export type Template = {
    name: string;
    description: string;
    moduleInstances: TemplateModuleInstance[];
};

export function createTemplateModuleInstance<M extends keyof ModuleSerializedStateMap = keyof ModuleSerializedStateMap>(
    moduleName: M,
    options: Omit<TemplateModuleInstance<M>, "moduleName">,
): TemplateModuleInstance<M> {
    return {
        moduleName,
        ...options,
    };
}

export class TemplateRegistry {
    private static _registeredTemplates: Template[] = [];

    private constructor() {}

    static registerTemplate(template: Template): void {
        if (this._registeredTemplates.find((t) => t.name === template.name)) {
            throw new Error(`Template with name ${template.name} already registered.`);
        }
        this._registeredTemplates.push(template);
    }

    static getRegisteredTemplates(): Template[] {
        return this._registeredTemplates;
    }

    static getTemplate(name: string): Template {
        const template = this._registeredTemplates.find((t) => t.name === name);
        if (!template) {
            throw new Error(`Template with name ${name} not registered.`);
        }
        return template;
    }
}
