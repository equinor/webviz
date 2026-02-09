import React from "react";

import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSelect } from "@lib/components/ColorSelect";
import type { ColorPalette } from "@lib/utils/ColorPalette";

import type {
    OverriddenValueRepresentationArgs,
    SettingComponentProps,
    StaticSettingImplementation,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringOrNull } from "../utils/structureValidation";

type ValueType = string | null;

function* makeColorGenerator(palette: ColorPalette) {
    const colors = palette.getColors();
    let i = 0;

    while (true) {
        yield colors[i % colors.length];
        i++;
    }
}

export class SingleColorSetting implements StaticSettingImplementation<ValueType> {
    // ? How do I get this one tied to work-bench settings?
    static _colorGenerator = makeColorGenerator(defaultColorPalettes[0]);

    defaultValue: ValueType;

    constructor() {
        this.defaultValue = SingleColorSetting._colorGenerator.next().value ?? null;
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isStringOrNull(value);
    }

    isValueValid(value: ValueType): boolean {
        if (!value) return false;

        return /^#[0-9A-Fa-f]{6}$/.test(value); // Validates hex color
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringOrNull(parsed);
        return parsed;
    }

    fixupValue(value: ValueType): NonNullable<ValueType> {
        if (!value) return this.defaultValue ?? "";
        return value;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function SingleColorSettingComponent(props: SettingComponentProps<ValueType>) {
            const initialColor = props.value?.slice(0, 7) ?? "#000000";

            const [color, setColor] = React.useState<string>(initialColor);

            function handleColorChange(color: string) {
                setColor(color);
                props.onValueChange(color);
            }

            return <ColorSelect onChange={handleColorChange} value={color!} dense />;
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
