import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import { Setting } from "../../settings/settingsDefinitions";

export class RealizationView implements CustomGroupImplementationWithSettings<[Setting.REALIZATION]> {
    settings: [Setting.REALIZATION] = [Setting.REALIZATION];

    getDefaultName(): string {
        return "Intersection view";
    }

    getDefaultSettingsValues() {
        return {
            realization: null,
        };
    }
}
