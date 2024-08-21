import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { atom } from "jotai";

/**
 * Extension of the template track type with additional fields used while editing
 */
export type TemplateTrackConfig = TemplateTrack & {
    // ID used to allow the settings-menu to drag-sort them
    _id: string;
};

export const logViewerTrackConfigs = atom<TemplateTrackConfig[]>([]);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedWellLogNameAtom = atom<string | null>(null);
export const userSelectedWellLogCurveNamesAtom = atom<string[]>([]);
