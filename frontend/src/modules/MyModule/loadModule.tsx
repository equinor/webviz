import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    type: ColorScaleType.Discrete,
    gradientType: ColorScaleGradientType.Sequential,
};

const module = ModuleRegistry.initModule<State>("MyModule", defaultState);

module.viewFC = view;
module.settingsFC = settings;
