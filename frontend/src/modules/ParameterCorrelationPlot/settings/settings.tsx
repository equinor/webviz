import type React from "react";

import { useAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { corrCutOffAtom, numParamsAtom, plotTypeAtom, showLabelsAtom } from "./atoms/baseAtoms";
import { Checkbox } from "@lib/components/Checkbox";

const plotTypes = [{ value: PlotType.ParameterCorrelation, label: "Parameter correlation" }];

//-----------------------------------------------------------------------------------------------------------
export function Settings({ initialSettings }: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [numParams, setNumParams] = useAtom(numParamsAtom);
    const [corrCutOff, setCorrCutOff] = useAtom(corrCutOffAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "numParams", "number", setNumParams);
    useApplyInitialSettingsToState(initialSettings, "showLabels", "boolean", setShowLabels);
    useApplyInitialSettingsToState(initialSettings, "corrCutOff", "number", setCorrCutOff);

    function handlePlotTypeChanged(value: string) {
        setPlotType(value as PlotType);
    }

    function handleNumParamsChange(_: Event, value: number | number[]) {
        if (Array.isArray(value)) {
            return;
        }
        setNumParams(value);
    }
    function handleCorrCutOffChange(_: Event, value: number | number[]) {
        if (Array.isArray(value)) {
            return;
        }
        setCorrCutOff(value);
    }
    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot settings" expanded>
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
                <Label text="Correlation cut-off (abs)" key="correlation-cut-off">
                    <Slider
                        value={corrCutOff}
                        onChange={handleCorrCutOffChange}
                        min={0}
                        step={0.01}
                        max={1}
                        valueLabelDisplay="auto"
                    />
                </Label>
                <Label text="Show parameter labels" position="left" key="show-labels">
                    <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                </Label>
            </CollapsibleGroup>
            ,
        </div>
    );
}

Settings.displayName = "Settings";
