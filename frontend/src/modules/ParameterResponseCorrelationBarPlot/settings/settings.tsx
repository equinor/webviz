import { useAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";

import type { Interfaces } from "../interfaces";

import { corrCutOffAtom, numParamsAtom, showLabelsAtom } from "./atoms/baseAtoms";

//-----------------------------------------------------------------------------------------------------------
export function Settings({ initialSettings }: ModuleSettingsProps<Interfaces>) {
    const [numParams, setNumParams] = useAtom(numParamsAtom);
    const [corrCutOff, setCorrCutOff] = useAtom(corrCutOffAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

    useApplyInitialSettingsToState(initialSettings, "numParams", "number", setNumParams);
    useApplyInitialSettingsToState(initialSettings, "showLabels", "boolean", setShowLabels);
    useApplyInitialSettingsToState(initialSettings, "corrCutOff", "number", setCorrCutOff);

    function handleNumParamsChange(_: Event, value: number | number[]) {
        if (Array.isArray(value)) {
            return;
        }
        setNumParams(value);
    }
    function handleCorrCutOffChange(e: React.ChangeEvent<HTMLInputElement>) {
        let threshold = e.target.value ? parseFloat(e.target.value) : 0.0;
        threshold = Math.max(0.0, Math.min(1.0, Math.abs(threshold))); // Ensure threshold is between 0 and 1
        setCorrCutOff(threshold);
    }
    return (
        <CollapsibleGroup title="Plot settings" expanded>
            <div className="flex flex-col gap-2">
                <Label text="Max number of parameters" key="number-of-params">
                    <Slider
                        value={numParams}
                        onChange={handleNumParamsChange}
                        min={2}
                        step={1}
                        max={500}
                        valueLabelDisplay="auto"
                    />
                </Label>
                <Label text="Correlation cutoff (absolute)">
                    <input
                        type="number"
                        step={0.01}
                        min={0}
                        max={1}
                        value={corrCutOff}
                        onChange={handleCorrCutOffChange}
                        className="w-full p-1 border border-gray-300 rounded"
                    />
                </Label>
                <Label text="Show parameter labels" position="left" key="show-labels">
                    <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                </Label>
            </div>
        </CollapsibleGroup>
    );
}
