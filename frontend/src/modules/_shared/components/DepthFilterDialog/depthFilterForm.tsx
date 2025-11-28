import type React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

export type DepthFilterConfig = {
    useOpaqueCutoff?: boolean;
    tvdCutoffAbove?: number;
    tvdCutoffBelow?: number;
};

export type DepthFilterFormProps = {
    value: DepthFilterConfig;
    onValueChange: (value: DepthFilterConfig) => void;
    onFormSubmit: () => void;
} & React.FormHTMLAttributes<HTMLFormElement>;

export function DepthFilterForm(props: DepthFilterFormProps): React.ReactNode {
    const { value, onValueChange, onFormSubmit, ...otherProps } = props;
    function handleAboveValueChange(newAbove: string) {
        const newValue = { ...value, tvdCutoffAbove: newAbove === "" ? undefined : parseFloat(newAbove) };
        onValueChange(newValue);
    }

    function handleBelowValueChange(newBelow: string) {
        const newValue = { ...value, tvdCutoffBelow: newBelow === "" ? undefined : parseFloat(newBelow) };
        onValueChange(newValue);
    }

    function handleUseOpaqueChange(newUseOpaque: boolean) {
        const newValue = { ...value, useOpaqueCutoff: newUseOpaque };
        onValueChange(newValue);
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        onFormSubmit();
    }
    return (
        <form onSubmit={handleFormSubmit} {...otherProps}>
            <h3>True Vertical Depth (TVD) Cutoffs</h3>

            <p className="text-xs text-gray-500 mb-4">
                Set depth limits to filter trajectories. Leave empty for no cutoff.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-2">
                {/* TVD Cutoff Base */}
                <Label text="Above (meters)">
                    <Input
                        className="w-full text-sm"
                        value={value.tvdCutoffAbove ?? ""}
                        type="number"
                        placeholder="e.g. 3000"
                        allowEmptyNumber
                        onChange={(e) => handleAboveValueChange(e.target.value)}
                    />
                </Label>
                {/* TVD Cutoff Top */}
                <Label text="Below (meters)">
                    <Input
                        className="w-full text-sm"
                        value={value.tvdCutoffBelow ?? ""}
                        type="number"
                        placeholder="e.g. 1000"
                        allowEmptyNumber
                        onChange={(e) => handleBelowValueChange(e.target.value)}
                    />
                </Label>
            </div>

            <Label text="Show filtered sections as opaque" position="left" childrenWrapperClassName="mb-1">
                <Checkbox checked={value.useOpaqueCutoff} onChange={(e) => handleUseOpaqueChange(e.target.checked)} />
            </Label>
        </form>
    );
}
