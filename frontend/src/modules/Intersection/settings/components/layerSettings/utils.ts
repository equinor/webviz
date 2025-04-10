import { isEqual } from "lodash";

import type { LayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";


export function fixupSetting<TSettings extends LayerSettings, TKey extends keyof TSettings>(
    setting: TKey,
    validOptions: readonly TSettings[TKey][],
    settings: TSettings,
): TSettings[TKey] {
    if (validOptions.length === 0) {
        return settings[setting];
    }

    if (!validOptions.some((el) => isEqual(el, settings[setting])) || settings[setting] === null) {
        return validOptions[0];
    }

    return settings[setting];
}
