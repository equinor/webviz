import { ColorPaletteType, ColorScaleDiscreteSteps, WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

export enum WorkbenchSettingsEvents {
    ColorPalettesChanged = "ColorPalettesChanged",
}

export type UseDiscreteColorScaleOptions = {
    gradientType: ColorScaleGradientType;
};

export type UseContinuousColorScaleOptions = {
    gradientType: ColorScaleGradientType;
};

export class PrivateWorkbenchSettings extends WorkbenchSettings {
    constructor() {
        super();

        this.loadSelectedColorPaletteIdsFromLocalStorage();
        this.loadStepsFromLocalStorage();
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

        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    private loadStepsFromLocalStorage(): void {
        const stepsString = localStorage.getItem("discreteColorScaleSteps");
        if (!stepsString) {
            return;
        }

        const steps = JSON.parse(stepsString);
        if (!steps) return;

        this._steps = steps;

        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    private storeSelectedColorPaletteIdsToLocalStorage(): void {
        localStorage.setItem("selectedColorPalettes", JSON.stringify(this._selectedColorPalettes));
    }

    private storeStepsToLocalStorage(): void {
        localStorage.setItem("discreteColorScaleSteps", JSON.stringify(this._steps));
    }

    private notifySubscribers(event: WorkbenchSettingsEvents): void {
        const subscribers = this._subscribersMap[event];
        if (!subscribers) return;

        subscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    getSelectedColorPalette(type: ColorPaletteType): ColorPalette {
        const colorPalette = this._colorPalettes[type].find((el) => el.getId() === this._selectedColorPalettes[type]);
        if (!colorPalette) {
            throw new Error("Could not find selected color palette");
        }
        return colorPalette;
    }

    getSelectedColorPaletteIds(): Record<ColorPaletteType, string> {
        return this._selectedColorPalettes;
    }

    setSelectedColorPaletteId(type: ColorPaletteType, id: string): void {
        this._selectedColorPalettes[type] = id;
        this.storeSelectedColorPaletteIdsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    getSteps(): {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    } {
        return this._steps;
    }

    setSteps(steps: {
        [ColorScaleDiscreteSteps.Sequential]: number;
        [ColorScaleDiscreteSteps.Diverging]: number;
    }): void {
        this._steps = steps;
        this.storeStepsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }

    getStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential): number {
        return this._steps[type];
    }

    setStepsForType(type: ColorScaleDiscreteSteps.Diverging | ColorScaleDiscreteSteps.Sequential, steps: number): void {
        this._steps[type] = steps;
        this.storeStepsToLocalStorage();
        this.notifySubscribers(WorkbenchSettingsEvents.ColorPalettesChanged);
    }
}
