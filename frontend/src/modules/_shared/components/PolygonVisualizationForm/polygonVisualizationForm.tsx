import type React from "react";

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

    function handleLineOpacityChange(event: Event, value: number | number[]) {
        const numValue = Array.isArray(value) ? value[0] : value;
        const newValue = { ...props.value, lineOpacity: numValue };
        props.onChange(newValue);
    }

    function handleFillChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newValue = { ...props.value, fill: e.target.checked };
        props.onChange(newValue);
    }

    function handleFillOpacityChange(event: Event, value: number | number[]) {
        const numValue = Array.isArray(value) ? value[0] : value;
        const newValue = { ...props.value, fillOpacity: numValue };
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

    return (
        <div className="flex flex-col gap-6 p-4">
            <div>
                <Label text="Color" position="left">
                    <ColorSelect onChange={handleColorChange} value={props.value.color} dense />
                </Label>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Line Settings</h4>

                <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                        <Label text="Width" position="left">
                            <Input
                                type="number"
                                min={0.5}
                                max={10}
                                step={0.1}
                                value={props.value.lineThickness.toString()}
                                onValueChange={handleLineThicknessChange}
                                style={{ width: "80px" }}
                            />
                        </Label>
                    </div>
                    <div className="flex-1">
                        <Label text="Opacity" position="left">
                            <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={props.value.lineOpacity}
                                onChange={handleLineOpacityChange}
                            />
                        </Label>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Fill Settings</h4>

                <div className="mb-3">
                    <Label text="Enable Fill" position="left">
                        <Switch checked={props.value.fill} onChange={handleFillChange} />
                    </Label>
                </div>

                {props.value.fill && (
                    <div>
                        <Label text="Fill Opacity" position="left">
                            <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={props.value.fillOpacity}
                                onChange={handleFillOpacityChange}
                            />
                        </Label>
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Label Settings</h4>

                <div className="mb-3">
                    <Label text="Show Labels" position="left">
                        <Switch checked={props.value.showLabels} onChange={handleShowLabelsChange} />
                    </Label>
                </div>

                {props.value.showLabels && (
                    <div className="flex flex-col gap-3">
                        <Label text="Label Position" position="left">
                            <Dropdown
                                options={labelPositionOptions}
                                value={props.value.labelPosition}
                                onChange={handleLabelPositionChange}
                            />
                        </Label>
                        <Label text="Label Color" position="left">
                            <ColorSelect onChange={handleLabelColorChange} value={props.value.labelColor} dense />
                        </Label>
                    </div>
                )}
            </div>
        </div>
    );
}
