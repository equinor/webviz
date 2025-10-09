import type { ChangeEvent } from "react";
import React from "react";

import { Button } from "@lib/components/Button";
import { ColorSelect } from "@lib/components/ColorSelect";
import { Dialog } from "@lib/components/Dialog";
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

export interface PolygonVisualizationDialogProps {
    open: boolean;
    onClose: () => void;
    value: PolygonVisualizationSpec;
    onChange: (value: PolygonVisualizationSpec) => void;
}

export const PolygonVisualizationDialog: React.FC<PolygonVisualizationDialogProps> = ({
    open,
    onClose,
    value,
    onChange,
}) => {
    const [localValue, setLocalValue] = React.useState<PolygonVisualizationSpec>(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    function handleColorChange(color: string) {
        const newValue = { ...localValue, color };
        setLocalValue(newValue);
    }

    function handleLineThicknessChange(thickness: string) {
        const numValue = parseFloat(thickness);
        if (!isNaN(numValue) && numValue >= 0.5 && numValue <= 10) {
            const newValue = { ...localValue, lineThickness: numValue };
            setLocalValue(newValue);
        }
    }

    function handleLineOpacityChange(event: Event, value: number | number[]) {
        const numValue = Array.isArray(value) ? value[0] : value;
        const newValue = { ...localValue, lineOpacity: numValue };
        setLocalValue(newValue);
    }

    function handleFillChange(e: ChangeEvent<HTMLInputElement>) {
        const newValue = { ...localValue, fill: e.target.checked };
        setLocalValue(newValue);
    }

    function handleFillOpacityChange(event: Event, value: number | number[]) {
        const numValue = Array.isArray(value) ? value[0] : value;
        const newValue = { ...localValue, fillOpacity: numValue };
        setLocalValue(newValue);
    }

    function handleShowLabelsChange(e: ChangeEvent<HTMLInputElement>) {
        const newValue = { ...localValue, showLabels: e.target.checked };
        setLocalValue(newValue);
    }

    function handleLabelPositionChange(position: string) {
        const newValue = { ...localValue, labelPosition: position as LabelPositionType };
        setLocalValue(newValue);
    }

    function handleLabelColorChange(color: string) {
        const newValue = { ...localValue, labelColor: color };
        setLocalValue(newValue);
    }

    function handleApply() {
        onChange(localValue);
        onClose();
    }

    function handleCancel() {
        setLocalValue(value);
        onClose();
    }

    const actions = (
        <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={handleCancel}>
                Cancel
            </Button>
            <Button variant="contained" onClick={handleApply}>
                Apply
            </Button>
        </div>
    );

    const labelPositionOptions = [
        { value: LabelPositionType.CENTROID, label: "Center of polygon" },
        { value: LabelPositionType.CENTROID_SNAPPED, label: "Center of polygon (snapped to closest point)" },
        { value: LabelPositionType.FIRST_POINT, label: "First point" },
        { value: LabelPositionType.LAST_POINT, label: "Last point" },
    ];

    return (
        <Dialog open={open} onClose={handleCancel} title="Polygon Visualization Settings" width={450} actions={actions}>
            <div className="flex flex-col gap-6 p-4">
                <div>
                    <Label text="Color" position="left">
                        <ColorSelect onChange={handleColorChange} value={localValue.color} dense />
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
                                    value={localValue.lineThickness.toString()}
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
                                    value={localValue.lineOpacity}
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
                            <Switch checked={localValue.fill} onChange={handleFillChange} />
                        </Label>
                    </div>

                    {localValue.fill && (
                        <div>
                            <Label text="Fill Opacity" position="left">
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={localValue.fillOpacity}
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
                            <Switch checked={localValue.showLabels} onChange={handleShowLabelsChange} />
                        </Label>
                    </div>

                    {localValue.showLabels && (
                        <div className="flex flex-col gap-3">
                            <Label text="Label Position" position="left">
                                <Dropdown
                                    options={labelPositionOptions}
                                    value={localValue.labelPosition}
                                    onChange={handleLabelPositionChange}
                                />
                            </Label>
                            <Label text="Label Color" position="left">
                                <ColorSelect onChange={handleLabelColorChange} value={localValue.labelColor} dense />
                            </Label>
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
};
