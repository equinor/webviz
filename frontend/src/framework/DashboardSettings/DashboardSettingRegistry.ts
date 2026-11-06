import { DashboardSettingDefinition, type DashboardSettingOptions } from "./DashboardSettingDefinition";

export class DashboardSettingRegistry {
    // Insertion-ordered - the registration order is the display order of active dashboard settings.
    private static _registeredSettings = new Map<string, DashboardSettingDefinition<any, any>>();

    private constructor() {}

    static registerDashboardSetting<TValue, TConstraints>(
        options: DashboardSettingOptions<TValue, TConstraints>,
    ): DashboardSettingDefinition<TValue, TConstraints> {
        if (this._registeredSettings.has(options.key)) {
            throw new Error(`Dashboard setting with key '${options.key}' is already registered.`);
        }

        const settingDefinition = new DashboardSettingDefinition<TValue, TConstraints>(options);
        this._registeredSettings.set(options.key, settingDefinition);
        return settingDefinition;
    }

    static getRegisteredSetting(key: string): DashboardSettingDefinition<any, any> | undefined {
        return this._registeredSettings.get(key);
    }

    static getRegisteredSettings(): DashboardSettingDefinition<any, any>[] {
        return Array.from(this._registeredSettings.values());
    }

    // Unregistered keys (e.g. test-only definitions) sort last.
    static getRegistrationIndex(key: string): number {
        const index = Array.from(this._registeredSettings.keys()).indexOf(key);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    }
}
