import type { KeyKind } from "./DataChannelTypes";
import type { SyncSettingKey } from "./SyncSettings";
import type { LayoutElement } from "./Workbench";

export type DataChannelTemplate = {
    listensToInstanceRef: string;
    kindOfKey: KeyKind;
    channelIdString: string;
};

export type TemplateLayoutElement = Omit<LayoutElement, "moduleInstanceId" | "moduleName">;

export type Template = {
    description: string;
    moduleInstances: {
        instanceRef?: string;
        moduleName: string;
        layout: TemplateLayoutElement;
        syncedSettings?: SyncSettingKey[];
        dataChannelsToInitialSettingsMapping?: Record<string, DataChannelTemplate>;
        initialSettings?: Record<string, unknown>;
    }[];
};

export class TemplateRegistry {
    private static _registeredTemplates: Record<string, Template> = {};

    private constructor() {}

    static registerTemplate(name: string, template: Template): void {
        this._registeredTemplates[name] = template;
    }

    static getRegisteredTemplates(): Record<string, Template> {
        return this._registeredTemplates;
    }

    static getTemplate(name: string): Template | undefined {
        const template = this._registeredTemplates[name];
        if (template) {
            return template;
        }
        throw new Error(`Template with name ${name} not registered.`);
    }
}
