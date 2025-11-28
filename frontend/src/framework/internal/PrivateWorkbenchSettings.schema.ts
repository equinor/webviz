import type { JTDSchemaType } from "ajv/dist/types/jtd-schema";

import { ColorPaletteType, ColorScaleDiscreteSteps } from "@framework/WorkbenchSettings";

export type SerializedWorkbenchSettingsState = {
    selectedColorPalettes: Record<ColorPaletteType, string>;
    discreteColorScaleSteps: Record<ColorScaleDiscreteSteps, number>;
};

export const WORKBENCH_SETTINGS_STATE_SCHEMA: JTDSchemaType<SerializedWorkbenchSettingsState> = {
    properties: {
        selectedColorPalettes: {
            properties: {
                [ColorPaletteType.Categorical]: { type: "string" },
                [ColorPaletteType.ContinuousDiverging]: { type: "string" },
                [ColorPaletteType.ContinuousSequential]: { type: "string" },
            },
        },
        discreteColorScaleSteps: {
            properties: {
                [ColorScaleDiscreteSteps.Sequential]: { type: "int32" },
                [ColorScaleDiscreteSteps.Diverging]: { type: "int32" },
            },
        },
    },
} as const;
