import { atom } from "jotai";

import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

export const typeAtom = atom<ColorScaleType>(ColorScaleType.Discrete);
export const gradientTypeAtom = atom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);
export const minAtom = atom<number>(0);
export const maxAtom = atom<number>(18);
export const divMidPointAtom = atom<number>(9);

export const myPersistableAtom = persistableFixableAtom<string>({
    initialValue: "value1",
    isValidFunction: (value) => ["value1", "value2"].includes(value),
    fixupFunction: () => {
        return "value2"; // Default value if the current value is invalid
    },
});
