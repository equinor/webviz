import {
    defaultColorPalettes,
    defaultContinuousDivergingColorPalettes,
    defaultContinuousSequentialColorPalettes,
} from "@framework/utils/colorPalettes";
import {
    ColorPaletteType,
    ColorScaleDiscreteSteps,
    WorkbenchSettingsTopic,
    type WorkbenchSettings,
} from "@framework/WorkbenchSettings";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType, type ColorScaleOptions } from "@lib/utils/ColorScale";
import { ColorSet } from "@lib/utils/ColorSet";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import type { SerializedWorkbenchSettingsState } from "./PrivateWorkbenchSettings.schema";

export type UseDiscreteColorScaleOptions = {
    gradientType: ColorScaleGradientType;
};

export type UseContinuousColorScaleOptions = {
    gradientType: ColorScaleGradientType;
};

export enum PrivateWorkbenchSettingsTopic {
    SERIALIZED_STATE = "SerializedState",
}

export type WorkbenchSettingsTopicPayloads = {
    [WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS]: Record<ColorPaletteType, string>;
    [WorkbenchSettingsTopic.SELECTED_STEPS]: Record<ColorScaleDiscreteSteps, number>;
    [PrivateWorkbenchSettingsTopic.SERIALIZED_STATE]: void;
};

export class PrivateWorkbenchSettings implements WorkbenchSettings {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<WorkbenchSettingsTopicPayloads>();

    private _colorPalettes: Record<ColorPaletteType, ColorPalette[]>;
    private _selectedColorPalettes: Record<ColorPaletteType, string>;
    private _steps: Record<ColorScaleDiscreteSteps, number>;

    constructor() {
        this._colorPalettes = {
            [ColorPaletteType.Categorical]: defaultColorPalettes,
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes,
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes,
        };
        this._selectedColorPalettes = {
            [ColorPaletteType.Categorical]: defaultColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousSequential]: defaultContinuousSequentialColorPalettes[0].getId(),
            [ColorPaletteType.ContinuousDiverging]: defaultContinuousDivergingColorPalettes[0].getId(),
        };

        this._steps = {
            [ColorScaleDiscreteSteps.Sequential]: 10,
            [ColorScaleDiscreteSteps.Diverging]: 10,
        };

        this.loadSelectedColorPaletteIdsFromLocalStorage();
        this.loadStepsFromLocalStorage();
    }

    serializeState(): SerializedWorkbenchSettingsState {
        return {
            selectedColorPalettes: this._selectedColorPalettes,
            discreteColorScaleSteps: this._steps,
        };
    }

    deserializeState(serializedState: SerializedWorkbenchSettingsState): void {
        this._selectedColorPalettes = serializedState.selectedColorPalettes;
        this._steps = serializedState.discreteColorScaleSteps;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<WorkbenchSettingsTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof WorkbenchSettingsTopicPayloads>(
        topic: T,
    ): () => WorkbenchSettingsTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS) {
                return this._selectedColorPalettes as WorkbenchSettingsTopicPayloads[T];
            }
            if (topic === WorkbenchSettingsTopic.SELECTED_STEPS) {
                return this._steps as WorkbenchSettingsTopicPayloads[T];
            }
            if (topic === PrivateWorkbenchSettingsTopic.SERIALIZED_STATE) {
                return void 0;
            }

            throw new Error(`No snapshot getter for topic ${String(topic)}`);
        };

        return snapshotGetter;
    }

    private handleStateChange(): void {
        this._publishSubscribeDelegate.notifySubscribers(PrivateWorkbenchSettingsTopic.SERIALIZED_STATE);
    }

    private loadSelectedColorPaletteIdsFromLocalStorage(): void {
        const selectedColorPalettesString = localStorage.getItem("selectedColorPalettes");
        if (!selectedColorPalettesString) {
            return;
        }

        const selectedColorPalettes = JSON.parse(selectedColorPalettesString);
        if (!selectedColorPalettes) return;

        for (const key of Object.keys(this._selectedColorPalettes)) {
            if (
                selectedColorPalettes[key] &&
                this._colorPalettes[key as ColorPaletteType].find((el) => el.getId() === selectedColorPalettes[key])
            ) {
                this._selectedColorPalettes[key as ColorPaletteType] = selectedColorPalettes[key];
            }
        }

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS);
    }

    private loadStepsFromLocalStorage(): void {
        const stepsString = localStorage.getItem("discreteColorScaleSteps");
        if (!stepsString) {
            return;
        }

        const steps = JSON.parse(stepsString);
        if (!steps) return;

        this._steps = steps;

        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSettingsTopic.SELECTED_STEPS);
    }

    private storeSelectedColorPaletteIdsToLocalStorage(): void {
        localStorage.setItem("selectedColorPalettes", JSON.stringify(this._selectedColorPalettes));
    }

    private storeStepsToLocalStorage(): void {
        localStorage.setItem("discreteColorScaleSteps", JSON.stringify(this._steps));
    }

    getSelectedColorPalette(type: ColorPaletteType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getId() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    getColorPalettes(): Record<ColorPaletteType, ColorPalette[]> {
        return this._colorPalettes;
    }

    getSelectedColorPaletteIds(): Record<ColorPaletteType, string> {
        return this._selectedColorPalettes;
    }

    setSelectedColorPaletteId(type: ColorPaletteType, id: string): void {
        this._selectedColorPalettes = {
            ...this._selectedColorPalettes,
            [type]: id,
        };
        this.storeSelectedColorPaletteIdsToLocalStorage();
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSettingsTopic.SELECTED_COLOR_PALETTE_IDS);
        this.handleStateChange();
    }

    getSteps(): Record<ColorScaleDiscreteSteps, number> {
        return this._steps;
    }

    setSteps(steps: Record<ColorScaleDiscreteSteps, number>): void {
        this._steps = steps;
        this.storeStepsToLocalStorage();
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSettingsTopic.SELECTED_STEPS);
        this.handleStateChange();
    }

    getStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential): number {
        return this._steps[type];
    }

    setStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential, steps: number): void {
        this._steps = {
            ...this._steps,
            [type]: steps,
        };
        this.storeStepsToLocalStorage();
        this._publishSubscribeDelegate.notifySubscribers(WorkbenchSettingsTopic.SELECTED_STEPS);
        this.handleStateChange();
    }

    makeColorSet(): ColorSet {
        return new ColorSet(this.getSelectedColorPalette(ColorPaletteType.Categorical));
    }

    makeDiscreteColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Discrete,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorPaletteType.ContinuousSequential
                    : ColorPaletteType.ContinuousDiverging,
            ),
            gradientType: options.gradientType,
            steps: this.getSteps()[
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorScaleDiscreteSteps.Sequential
                    : ColorScaleDiscreteSteps.Diverging
            ],
        };

        return new ColorScale(optionsWithDefaults);
    }

    makeContinuousColorScale(options: { gradientType: ColorScaleGradientType }): ColorScale {
        const optionsWithDefaults: ColorScaleOptions = {
            type: ColorScaleType.Continuous,
            colorPalette: this.getSelectedColorPalette(
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorPaletteType.ContinuousSequential
                    : ColorPaletteType.ContinuousDiverging,
            ),
            gradientType: options.gradientType,
            steps: this.getSteps()[
                options.gradientType === ColorScaleGradientType.Sequential
                    ? ColorScaleDiscreteSteps.Sequential
                    : ColorScaleDiscreteSteps.Diverging
            ],
        };

        return new ColorScale(optionsWithDefaults);
    }
}
