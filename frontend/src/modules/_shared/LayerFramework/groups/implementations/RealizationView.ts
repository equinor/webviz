import { CustomGroupImplementationWithSettings } from "../../interfaces";
import { SettingType } from "../../settings/settingsTypes";

export class RealizationView implements CustomGroupImplementationWithSettings<[SettingType.REALIZATION]> {
    settings: [SettingType.REALIZATION] = [SettingType.REALIZATION];

    getDefaultName(): string {
        return "Intersection view";
    }

    getDefaultSettingsValues() {
        return {
            realization: null,
        };
    }
}
