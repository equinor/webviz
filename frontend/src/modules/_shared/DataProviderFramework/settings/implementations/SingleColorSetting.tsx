import React from "react";

import { Check } from "@mui/icons-material";
import { isEqual } from "lodash";

import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSelect } from "@lib/components/ColorSelect";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Slider } from "@lib/components/Slider";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string | null;

function* makeColorGenerator(palette: ColorPalette) {
    const colors = palette.getColors();
    let i = 0;

    while (true) {
        yield colors[i % colors.length];
        i++;
    }
}

export class SingleColorSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    // ? How do I get this one tied to work-bench settings?
    static _colorGenerator = makeColorGenerator(defaultColorPalettes[0]);
    private _withAlpha: boolean;

    defaultValue: ValueType;

    constructor(withAlpha: boolean = false) {
        this.defaultValue = SingleColorSetting._colorGenerator.next().value ?? null;
        if (withAlpha) {
            this.defaultValue += "ff"; // Default to fully opaque if alpha is included
        }
        this._withAlpha = withAlpha;
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(value: ValueType): boolean {
        if (!value) return false;

        if (this._withAlpha) {
            return /^#[0-9A-Fa-f]{8}$/.test(value); // Validates hex color with alpha
        }

        return /^#[0-9A-Fa-f]{6}$/.test(value); // Validates hex color
    }

    serializeValue(value: ValueType): string {
        return value ?? "";
    }

    deserializeValue?(serializedValue: string): ValueType {
        if (serializedValue === "") return null;
        return serializedValue;
    }

    fixupValue(value: ValueType): NonNullable<ValueType> {
        if (!value) return this.defaultValue ?? "";
        return value;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        const { _withAlpha: withAlpha } = this;
        return function SingleColorSettingComponent(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
            const initialColor = props.value?.slice(0, 7) ?? "#000000";
            const initialAlpha =
                withAlpha && props.value?.length === 9 ? parseInt(props.value.slice(7, 9), 16) / 255 : 1;

            const [color, setColor] = React.useState<string>(initialColor);
            const [alpha, setAlpha] = React.useState<number>(initialAlpha);

            function handleColorChange(color: string) {
                setColor(color);
                if (!withAlpha) {
                    props.onValueChange(color);
                }
            }

            function handleAlphaChange(value: number) {
                setAlpha(value);
            }

            function handleClick() {
                const hexValue =
                    color +
                    Math.round(alpha * 255)
                        .toString(16)
                        .padStart(2, "0");
                props.onValueChange(hexValue);
            }

            const internalValue =
                color.slice(0, 7) +
                Math.round(alpha * 255)
                    .toString(16)
                    .padStart(2, "0");

            const hasChanges = !isEqual(internalValue, props.value);

            return (
                <div className="flex flex-row gap-2 items-center">
                    <ColorSelect onChange={handleColorChange} value={color!} dense />
                    <span>Opacity</span>
                    <div className={resolveClassNames("flex-1 min-w-16", { hidden: !withAlpha })}>
                        <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={alpha}
                            onChange={(_, value) => handleAlphaChange(value as number)}
                            disabled={!props.value}
                            valueLabelDisplay="auto"
                        />
                    </div>
                    <div className={resolveClassNames("min-w-16", { hidden: !withAlpha })}>
                        <DenseIconButton onClick={handleClick} title="Apply" disabled={!hasChanges}>
                            <Check fontSize="small" />
                        </DenseIconButton>
                    </div>
                </div>
            );
        };
    }

    overriddenValueRepresentation({ value }: OverriddenValueRepresentationArgs<ValueType>): React.ReactNode {
        if (!value) {
            return "-";
        }
        return (
            <div
                style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: value,
                    border: "1px solid #ccc",
                }}
            />
        );
    }
}
