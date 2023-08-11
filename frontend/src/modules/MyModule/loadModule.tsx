import { ModuleRegistry } from "@framework/ModuleRegistry";
import {
    ColorScaleContinuousInterpolationType,
    ColorScaleDiscreteInterpolationType,
    ColorScaleGradientType,
    ColorScaleType,
} from "@framework/WorkbenchSettings";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    continuousInterpolation: ColorScaleContinuousInterpolationType.Linear,
    discreteInterpolation: ColorScaleDiscreteInterpolationType.Linear,
    steps: 10,
    type: ColorScaleType.Discrete,
    gradientType: ColorScaleGradientType.Sequential,
};

const module = ModuleRegistry.initModule<State>("MyModule", defaultState);

module.viewFC = view;
module.settingsFC = settings;
