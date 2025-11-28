import React from "react";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import type { DepthFilterConfig } from "./depthFilterForm";
import { DepthFilterForm } from "./depthFilterForm";

export interface DepthFilterDialogProps {
    open: boolean;
    settings: DepthFilterConfig;
    onSettingsChange: (settings: DepthFilterConfig) => void;
    onClose: () => void;
}

export function DepthFilterDialog(props: DepthFilterDialogProps): React.ReactNode {
    const [localSettings, setLocalSettings] = React.useState<DepthFilterConfig>(props.settings);

    // Reset local settings when dialog opens with new settings
    React.useEffect(() => {
        if (props.open) {
            setLocalSettings(props.settings);
        }
    }, [props.open, props.settings]);

    const handleApply = () => {
        props.onSettingsChange(localSettings);
        props.onClose();
    };

    const handleCancel = () => {
        setLocalSettings(props.settings); // Reset to original
        props.onClose();
    };

    const handleTvdCutoffAboveChange = (value: string) => {
        const numValue = parseFloat(value);
        setLocalSettings((prev) => ({
            ...prev,
            tvdCutoffAbove: isNaN(numValue) ? undefined : numValue,
        }));
    };

    const handleTvdCutoffBelowChange = (value: string) => {
        const numValue = parseFloat(value);
        setLocalSettings((prev) => ({
            ...prev,
            tvdCutoffBelow: isNaN(numValue) ? undefined : numValue,
        }));
    };

    const dialogActions = (
        <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={handleCancel}>
                Cancel
            </Button>
            <Button variant="contained" onClick={handleApply}>
                Apply Settings
            </Button>
        </div>
    );

    return (
        <Dialog
            open={props.open}
            onClose={handleCancel}
            title="Depth Filter Settings"
            width="500px"
            height="600px"
            showCloseCross
            modal
            actions={dialogActions}
        >
            <div className="flex flex-col gap-6 p-6 max-h-full overflow-y-auto">
                <DepthFilterForm value={localSettings} onValueChange={setLocalSettings} onFormSubmit={handleApply} />

                {/* TVD Cutoff Settings */}

                <div className="space-y-4">
                    <h3>True Vertical Depth (TVD) Cutoffs</h3>

                    <p className="text-xs text-gray-500 mb-4">
                        Set depth limits to filter trajectories. Leave empty for no cutoff.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {/* TVD Cutoff Top */}
                        <Label text="Below (meters)">
                            <Input
                                type="number"
                                placeholder="e.g. 1000"
                                value={localSettings.tvdCutoffAbove?.toString() || ""}
                                onChange={(e) => handleTvdCutoffAboveChange(e.target.value)}
                                className="w-full text-sm"
                            />
                        </Label>

                        {/* TVD Cutoff Base */}
                        <Label text="Above (meters)">
                            <Input
                                type="number"
                                placeholder="e.g. 3000"
                                value={localSettings.tvdCutoffBelow?.toString() || ""}
                                onChange={(e) => handleTvdCutoffBelowChange(e.target.value)}
                                className="w-full text-sm"
                            />
                        </Label>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
