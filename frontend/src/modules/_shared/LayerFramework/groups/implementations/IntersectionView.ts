import { CustomGroupImplementationWithSettings } from "../../interfaces";
import { Setting } from "../../settings/settingsDefinitions";

export class IntersectionView implements CustomGroupImplementationWithSettings<[Setting.INTERSECTION]> {
    settings: [Setting.INTERSECTION] = [Setting.INTERSECTION];

    getDefaultName(): string {
        return "Intersection view";
    }

    getDefaultSettingsValues() {
        return {
            intersection: null,
        };
    }
}
