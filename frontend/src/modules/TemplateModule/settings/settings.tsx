import React from "react";

import { useAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { useContinuousColorScale, useDiscreteColorScale } from "@framework/WorkbenchSettings";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import type { Interfaces } from "../interfaces";

import { divMidPointAtom, gradientTypeAtom, maxAtom, minAtom, typeAtom } from "./atoms/baseAtoms";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { TextInput } from "@lib/newComponents/TextInput/textInput";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { SwitchCompositions } from "@lib/newComponents/Switch";
import { Select } from "@lib/newComponents/Select";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [ensembles, setEnsembles] = React.useState<RegularEnsembleIdent[]>([]);

    return (
        <Collapsible.ScrollArea>
            <Collapsible.Group title="First setting group" defaultOpen>
                <SettingWrapper.Group>
                    <SettingWrapper
                        label="Ensembles"
                        help={{
                            title: "Ensembles",
                            content:
                                "Larger input components can be displayed in a stacked layout to prevent them from being too cramped.",
                        }}
                        stacked
                    >
                        <EnsemblePicker
                            ensembles={ensembleSet.getEnsembleArray().filter((ens) => ens instanceof RegularEnsemble)}
                            value={ensembles}
                            allowDeltaEnsembles={false}
                            onValueChange={setEnsembles}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Second setting"
                        description="This is the second setting"
                        help={{
                            title: "Second setting",
                            content: "Smaller settings should be displayed in an inline layout.",
                        }}
                    >
                        <NumberInput value={0} onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        help={{
                            title: "Third setting",
                            content: "This setting has no label or description. The input spans the whole width.",
                        }}
                    >
                        <SwitchCompositions.WithLabel
                            label="Third setting"
                            onCheckedChange={() => {}}
                            checked={false}
                        />
                    </SettingWrapper>
                </SettingWrapper.Group>
            </Collapsible.Group>
            <Collapsible.Group title="Settings with overlays" defaultOpen>
                <SettingWrapper.Group>
                    <SettingWrapper
                        label="First setting"
                        help={{
                            title: "First setting",
                            content: "This is the first setting.",
                        }}
                        overlay={{ type: "info", message: "This is an informational overlay." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Setting with a long label"
                        overlay={{ type: "warning", message: "This is a warning overlay." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Setting with a large input"
                        stacked
                        overlay={{ type: "error", message: "This is an error overlay." }}
                    >
                        <Select
                            options={[
                                { label: "Option 1", value: "option1" },
                                { label: "Option 2", value: "option2" },
                            ]}
                            onValueChange={() => {}}
                            multiple
                            size={5}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Loading setting"
                        help={{
                            title: "Loading setting",
                            content: "This is a loading setting.",
                        }}
                        overlay={{ type: "loading" }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Long running"
                        help={{
                            title: "Long running",
                            content: "This is a setting depending on a long running task.",
                        }}
                        overlay={{ type: "loading", message: "This task is taking longer than expected..." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                </SettingWrapper.Group>
            </Collapsible.Group>
            <Collapsible.Group title="Settings with annotations" defaultOpen>
                <SettingWrapper.Group>
                    <SettingWrapper
                        label="First setting"
                        help={{
                            title: "First setting",
                            content: "This is the first setting.",
                        }}
                        errorAnnotation="This is an error annotation."
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                </SettingWrapper.Group>
            </Collapsible.Group>
        </Collapsible.ScrollArea>
    );
}
