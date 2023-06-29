import { BroadcastChannelKeyCategory } from "./Broadcaster";
import { SyncSettingKey } from "./SyncSettings";
import { LayoutElement } from "./Workbench";

export type DataChannelTemplate = {
    listensToTemplateId: string;
    keyCategory: BroadcastChannelKeyCategory;
    channelName: string;
};

export type ExtendedLayoutElement = LayoutElement & {
    templateElementId: string;
    syncedSettings?: SyncSettingKey[];
    dataChannelsToPresetPropsMapping?: Record<string, DataChannelTemplate>;
    presetProps?: Record<string, unknown>;
};

export type Template = {
    description: string;
    layout: ExtendedLayoutElement[];
};

export class TemplateRegistry {
    private static _registeredTemplates: Record<string, Template> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
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
