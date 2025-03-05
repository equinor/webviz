import { CustomGroupImplementationWithSettings } from "../../interfaces";
import { SettingType } from "../../settings/settingsTypes";

export class IntersectionView implements CustomGroupImplementationWithSettings<[SettingType.INTERSECTION]> {
    settings: [SettingType.INTERSECTION] = [SettingType.INTERSECTION];

    getDefaultName(): string {
        return "Intersection view";
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
        };
    }
}
