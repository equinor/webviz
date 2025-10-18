import React from "react";

import { isNaN } from "lodash";

import { ColorSelect } from "@lib/components/ColorSelect";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { Switch } from "@lib/components/Switch";
import { LabelPositionType } from "@modules/_shared/DataProviderFramework/visualization/deckgl/polygonUtils";

export type { LabelPositionType };

export interface PolygonVisualizationSpec {
    color: string;
    lineThickness: number;
    lineOpacity: number;
    fill: boolean;
    fillOpacity: number;
    showLabels: boolean;
    labelPosition: LabelPositionType;
    labelColor: string;
}

export interface PolygonVisualizationFormProps {
    value: PolygonVisualizationSpec;
    onChange: (value: PolygonVisualizationSpec) => void;
}

export function PolygonVisualizationForm(props: PolygonVisualizationFormProps) {
    function handleColorChange(color: string) {
        const newValue = { ...props.value, color };
        props.onChange(newValue);
    }

    function handleLineThicknessChange(thickness: string) {
        const numValue = parseFloat(thickness);
        if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 10) {
            const newValue = { ...props.value, lineThickness: numValue };
            props.onChange(newValue);
        }
    }

    function handleLineOpacityChange(newOpacity: number) {
        const newValue = { ...props.value, lineOpacity: newOpacity };
        props.onChange(newValue);
    }

    function handleFillEnabledChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newValue = { ...props.value, fill: e.target.checked };
        props.onChange(newValue);
    }

    function handleFillOpacityChange(newOpacity: number) {
        const newValue = { ...props.value, fillOpacity: newOpacity };
        props.onChange(newValue);
    }

    function handleShowLabelsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newValue = { ...props.value, showLabels: e.target.checked };
        props.onChange(newValue);
    }

    function handleLabelPositionChange(position: string) {
        const newValue = { ...props.value, labelPosition: position as LabelPositionType };
        props.onChange(newValue);
    }

    function handleLabelColorChange(color: string) {
        const newValue = { ...props.value, labelColor: color };
        props.onChange(newValue);
    }

    const labelPositionOptions = [
        { value: LabelPositionType.CENTROID, label: "Center of polygon" },
        { value: LabelPositionType.CENTROID_SNAPPED, label: "Center of polygon (snapped to closest point)" },
        { value: LabelPositionType.FIRST_POINT, label: "First point" },
        { value: LabelPositionType.LAST_POINT, label: "Last point" },
    ];

    const baseId = React.useId();
    const ids = {
        lineWidth: `line_width_${baseId}`,
        lineOpacity: `line_opacity_${baseId}`,
        fillEnable: `fill_enable_${baseId}`,
        fillOpacity: `fill_opacity_${baseId}`,
        labelEnable: `label_enable_${baseId}`,
        labelPosition: `label_position_${baseId}`,
        labelColor: `label_color_${baseId}`,
    };

    return (
        <div className="flex flex-col gap-6 p-4 ">
            <Label text="Polygon color" position="left" labelClassName="text-base! text-gray-700">
                <ColorSelect onChange={handleColorChange} value={props.value.color} dense />
            </Label>

            <div className="grid grid-cols-[auto_1fr] gap-2 items-center content-start">
                {/* --- Line settings --- */}
                <h4 className="col-span-2 font-bold">Line</h4>

                <label className="text-sm text-gray-500 leading-tight" htmlFor={ids.lineWidth}>
                    Width
                </label>
                <div>
                    <Input
                        id={ids.lineWidth}
                        type="number"
                        min={0.5}
                        max={10}
                        step={0.1}
                        value={props.value.lineThickness.toString()}
                        onValueChange={handleLineThicknessChange}
                        style={{ width: "80px" }}
                    />
                </div>

                <label className="text-sm text-gray-500 leading-tight" htmlFor={ids.lineOpacity}>
                    Opacity
                </label>
                <OpacitySlider
                    id={ids.lineOpacity}
                    value={props.value.lineOpacity}
                    onValueChange={handleLineOpacityChange}
                />

                {/* --- Fill settings --- */}
                <h4 className="col-span-2 flex gap-2 items-center font-bold mt-5">
                    <label htmlFor={ids.fillEnable}>Fill</label>
                    <Switch
                        id={ids.fillEnable}
                        size="small"
                        checked={props.value.fill}
                        onChange={handleFillEnabledChange}
                    />
                </h4>

                <label className="text-sm text-gray-500 leading-tight" htmlFor={ids.fillOpacity}>
                    Opacity
                </label>
                <OpacitySlider
                    disabled={!props.value.fill}
                    id={ids.fillOpacity}
                    value={props.value.fillOpacity}
                    onValueChange={handleFillOpacityChange}
                />

                {/* --- Label settings --- */}
                <h4 className="col-span-2 flex gap-2 items-center font-bold mt-5 ">
                    <label htmlFor={ids.labelEnable}>Label</label>
                    <Switch
                        id={ids.labelEnable}
                        size="small"
                        checked={props.value.showLabels}
                        onChange={handleShowLabelsChange}
                    />
                </h4>

                <label className="text-sm text-gray-500 leading-tight" htmlFor={ids.labelPosition}>
                    Position
                </label>
                <Dropdown
                    disabled={!props.value.showLabels}
                    id={ids.labelPosition}
                    options={labelPositionOptions}
                    value={props.value.labelPosition}
                    onChange={handleLabelPositionChange}
                />

                <label className="text-sm text-gray-500 leading-tight" htmlFor={ids.labelColor}>
                    Color
                </label>
                <ColorSelect
                    id={ids.labelColor}
                    value={props.value.labelColor}
                    disabled={!props.value.showLabels}
                    onChange={handleLabelColorChange}
                />
            </div>
        </div>
    );
}

function OpacitySlider(props: {
    id: string;
    value: number;
    disabled?: boolean;
    onValueChange: (newValue: number) => void;
}) {
    // Need to round to avoid occasional floating point errors
    const valuePercent = Math.round(props.value * 100);

    return (
        <div className="flex gap-1 w-full items-center">
            <div className="w-full gorw">
                <Slider
                    disabled={props.disabled}
                    value={props.value}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={(_, v) => props.onValueChange(v as number)}
                />
            </div>
            <div className="max-w-0 min-w-16">
                <Input
                    id={props.id}
                    value={valuePercent}
                    type="number"
                    disabled={props.disabled}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(evt) => {
                        const number = Number(evt.target.value);
                        if (isNaN(number)) {
                            props.onValueChange(0);
                        } else {
                            props.onValueChange(number / 100);
                        }
                    }}
                />
            </div>
        </div>
    );
}
