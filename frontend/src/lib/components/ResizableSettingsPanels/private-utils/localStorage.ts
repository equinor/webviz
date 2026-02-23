import type { SettingsPanelSizes } from "../resizableSettingsPanels";

export function loadConfigurationFromLocalStorage(id: string): SettingsPanelSizes | null {
    const configuration = localStorage.getItem(`resizable-settings-panels-${id}`);
    if (configuration) {
        const parsed = JSON.parse(configuration);
        return {
            leftSettings: typeof parsed?.leftSettings === "number" ? parsed.leftSettings : undefined,
            rightSettings: typeof parsed?.rightSettings === "number" ? parsed.rightSettings : undefined,
        };
    }
    return null;
}

export function storeConfigurationInLocalStorage(id: string, sizes: SettingsPanelSizes) {
    const toStore: Partial<Record<string, number>> = {};
    if (sizes.leftSettings !== undefined) toStore.leftSettings = sizes.leftSettings;
    if (sizes.rightSettings !== undefined) toStore.rightSettings = sizes.rightSettings;
    localStorage.setItem(`resizable-settings-panels-${id}`, JSON.stringify(toStore));
}
