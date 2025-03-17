import { CustomGroupImplementationWithSettings } from "../../interfaces";
import { Setting } from "../../settings/settingsTypes";

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
