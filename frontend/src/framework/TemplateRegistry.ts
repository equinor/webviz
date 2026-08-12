import type { ModuleSerializedStateMap } from "@modules/ModuleSerializedStateMap";

import type { ElevatedSettingDefinition } from "./ElevatedSettings/ElevatedSettingDefinition";
import type { ElevatedSettingsService } from "./ElevatedSettings/ElevatedSettingsService";
import type { SerializedElevatedSettingsState } from "./ElevatedSettings/ElevatedSettingsService.schema";
import type { LayoutElement } from "./internal/Dashboard";
import type { SyncSettingKey } from "./SyncSettings";
import type { KeyKind } from "./types/dataChannnel";

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
    // Applied to the dashboard's `ElevatedSettingsService` (via `deserializeState`) once the
    // template's module instances are set up - merge multiple `createTemplateElevatedSetting` calls
    // to set more than one. Only round-trips a plain value (it's shared with full dashboard session
    // restore, where constraints are always recomputed live from connected consumers instead) - use
    // `applyElevatedSettings` when a setting needs more than that, e.g. a constraint override.
    elevatedSettings?: SerializedElevatedSettingsState;
    // Called once, right after this specific template's module instances/layout/`elevatedSettings`
    // are set up on the dashboard. Each template is responsible for the elevated settings its own
    // modules need - a template that doesn't use a given elevated setting shouldn't activate or
    // constrain it, so this belongs here rather than on some check/template-group-wide hook that
    // would run regardless of which template was actually applied.
    applyElevatedSettings?: (elevatedSettingsService: ElevatedSettingsService) => void;
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

// Type-checks `value` against the elevated setting's own `TValue` before handing it to `Template`'s
// loosely-typed (`Record<string, unknown>`) `elevatedSettings`, which mirrors
// `ElevatedSettingsService.deserializeState`'s session-restore contract.
export function createTemplateElevatedSetting<TValue, TConstraints>(
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
    value: TValue,
): SerializedElevatedSettingsState {
    return { [definition.key]: value };
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
