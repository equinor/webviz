import type { ChangeEvent } from "react";
import React from "react";

import { Button } from "@lib/components/Button";
import { ColorSelect } from "@lib/components/ColorSelect";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";

export interface PolygonVisualizationSpec {
    color: string;
    lineThickness: number;
    fill: boolean;
    // opacity:number
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

    // Update local state when prop value changes
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

    function handleFillChange(e: ChangeEvent<HTMLInputElement>) {
        const newValue = { ...localValue, fill: e.target.checked };
        setLocalValue(newValue);
    }

    function handleApply() {
        onChange(localValue);
        onClose();
    }

    function handleCancel() {
        setLocalValue(value); // Reset to original value
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

    return (
        <Dialog open={open} onClose={handleCancel} title="Polygon Visualization Settings" width={400} actions={actions}>
            <div>
                <Label text="Color" position="left">
                    <ColorSelect onChange={handleColorChange} value={localValue.color} dense />
                </Label>
                <div className="flex items-center gap-3">
                    <Label text="Line Width" position="left">
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
                <Label text="Fill" position="left">
                    <Switch checked={localValue.fill} onChange={handleFillChange} />
                </Label>
            </div>
        </Dialog>
    );
};
