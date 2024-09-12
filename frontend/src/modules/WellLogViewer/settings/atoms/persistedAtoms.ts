import { atomWithModuleInstanceStorage, clearModuleInstanceStorage } from "@framework/utils/atomUtils";
import { TemplatePlot, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { Getter, Setter, atom } from "jotai";
import { Dictionary } from "lodash";

/**
 * Extension of the template track type with additional fields used while editing
 */
export type TemplatePlotConfig = Partial<TemplatePlot> & { _id: string; _isValid: boolean };
export type TemplateTrackConfig = Omit<TemplateTrack, "plots"> & {
    // ID used to allow the settings-menu to drag-sort them
    _id: string;
    plots: TemplatePlotConfig[];
};

const STORAGE_KEY = "moduleSettings";
const moduleSettingsAtom = atomWithModuleInstanceStorage<Dictionary<any>>(STORAGE_KEY, {});

function getPersistentModuleField(get: Getter, valueKey: string, defaultValue: any): typeof defaultValue {
    return get(moduleSettingsAtom)[valueKey] ?? defaultValue;
}

function setPersistentModuleField(get: Getter, set: Setter, valueKey: string, newValue: any) {
    const storageCopy = { ...get(moduleSettingsAtom) };
    storageCopy[valueKey] = newValue;

    set(moduleSettingsAtom, storageCopy);
}

export const logViewerTrackConfigs = atom<TemplateTrackConfig[], [TemplateTrackConfig[]], void>(
    (get) => getPersistentModuleField(get, "logViewerTrackConfigs", []),
    (get, set, newVal) => setPersistentModuleField(get, set, "logViewerTrackConfigs", newVal)
);

export const viewerHorizontalAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "viewerHorizontal", false),
    (get, set, newVal) => setPersistentModuleField(get, set, "viewerHorizontal", newVal)
);

export const padDataWithEmptyRowsAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "padDataWithEmptyRows", true),
    (get, set, newVal) => setPersistentModuleField(get, set, "padDataWithEmptyRows", newVal)
);

export function clearStorageForInstance(instanceId: string) {
    clearModuleInstanceStorage(instanceId, STORAGE_KEY);
}
