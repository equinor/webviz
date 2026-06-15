import { useAtom } from "jotai";

import { CheckboxCompositions } from "@lib/newComponents/Checkbox/compositions";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { Slider } from "@lib/newComponents/Slider";

import { corrCutOffAtom, numParamsAtom, showLabelsAtom } from "./atoms/baseAtoms";

//-----------------------------------------------------------------------------------------------------------
export function Settings() {
    const [numParams, setNumParams] = useAtom(numParamsAtom);
    const [corrCutOff, setCorrCutOff] = useAtom(corrCutOffAtom);
    const [showLabels, setShowLabels] = useAtom(showLabelsAtom);

    function handleNumParamsChange(value: number | readonly number[]) {
        const newValue = Array.isArray(value) ? value[0] : (value as number);
        setNumParams(newValue);
    }
    function handleCorrCutOffChange(value: number | null) {
        // Ensure threshold is between 0 and 1
        const threshold = value === null ? 0.0 : Math.max(0.0, Math.min(1.0, Math.abs(value)));
        setCorrCutOff(threshold);
    }
    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Plot settings" defaultOpen>
                    <SettingWrapper label="Max number of parameters">
                        <Slider
                            value={numParams}
                            onValueChange={handleNumParamsChange}
                            min={2}
                            step={1}
                            max={500}
                            valueLabelDisplay="auto"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Correlation cutoff (absolute)">
                        <NumberInput
                            value={corrCutOff}
                            onValueChange={handleCorrCutOffChange}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                    </SettingWrapper>
                    <SettingWrapper>
                        <CheckboxCompositions.WithLabel
                            label="Show parameter labels"
                            checked={showLabels}
                            onCheckedChange={setShowLabels}
                            size="small"
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
