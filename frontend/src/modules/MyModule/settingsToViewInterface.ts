import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { divMidPointAtom, gradientTypeAtom, maxAtom, minAtom, typeAtom } from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    type: ColorScaleType;
    gradientType: ColorScaleGradientType;
    min: number;
    max: number;
    divMidPoint: number;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    type: (get) => {
        return get(typeAtom);
    },
    gradientType: (get) => {
        return get(gradientTypeAtom);
    },
    min: (get) => {
        return get(minAtom);
    },
    max: (get) => {
        return get(maxAtom);
    },
    divMidPoint: (get) => {
        return get(divMidPointAtom);
    },
};
