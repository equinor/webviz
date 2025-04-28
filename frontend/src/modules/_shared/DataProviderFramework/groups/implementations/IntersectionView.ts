import { Setting } from "../..//settings/settingsDefinitions";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";

const intersectionViewSettings = [Setting.INTERSECTION, Setting.INTERSECTION_EXTENSION_LENGTH] as const;
export type IntersectionViewSettings = typeof intersectionViewSettings;

export class IntersectionView implements CustomGroupImplementationWithSettings<IntersectionViewSettings> {
    settings = intersectionViewSettings;

    getDefaultName(): string {
        return "Intersection view";
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
            intersectionExtensionLength: 500.0,
        };
    }
}
