import { useAtom } from "jotai";

import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Collapsible } from "@lib/components/Collapsible";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { Slider } from "@lib/components/Slider";

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
    function handleCorrCutOffChange(value: number | readonly number[]) {
        const newValue = Array.isArray(value) ? value[0] : (value as number);
        setCorrCutOff(newValue);
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
                    <SettingWrapper label={`Correlation cutoff (absolute): ${corrCutOff}`}>
                        <Slider
                            value={corrCutOff}
                            onValueChange={handleCorrCutOffChange}
                            min={0}
                            step={0.01}
                            max={1}
                            valueLabelDisplay="auto"
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
