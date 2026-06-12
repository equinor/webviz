import React from "react";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { Select } from "@lib/newComponents/Select";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { Switch } from "@lib/newComponents/Switch";
import { SwitchCompositions } from "@lib/newComponents/Switch/compositions";
import { TextInput } from "@lib/newComponents/TextInput";

import type { Interfaces } from "../interfaces";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [ensembles, setEnsembles] = React.useState<RegularEnsembleIdent[]>([]);
    const [setting4Enabled, setSetting4Enabled] = React.useState(false);
    const [setting5Enabled, setSetting5Enabled] = React.useState(false);

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="First setting group" defaultOpen>
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
                        help={{
                            title: "Second setting",
                            content: "Smaller settings should be displayed in an inline layout.",
                        }}
                    >
                        <NumberInput value={0} onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Second setting"
                        description="Use a stacked layout if a description is necessary - otherwise, move the description to the help section."
                        help={{
                            title: "Second setting",
                            content: "Smaller settings should be displayed in an inline layout.",
                        }}
                        stacked
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
                            onCheckedChange={() => {}}
                            checked={false}
                            label="Third setting"
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Fourth setting"
                        help={{
                            title: "Fourth setting",
                            content: "An inline setting with enabling switch.",
                        }}
                    >
                        <div className="gap-x-xs flex">
                            <Switch onCheckedChange={setSetting4Enabled} checked={setting4Enabled} />
                            <NumberInput value={0} onValueChange={() => {}} disabled={!setting4Enabled} />
                        </div>
                    </SettingWrapper>
                    <SettingWrapper
                        label="Fifth setting"
                        help={{
                            title: "Fifth setting",
                            content: "A stacked setting with enabling switch.",
                        }}
                        stacked
                    >
                        <div className="gap-y-xs flex flex-col">
                            <SwitchCompositions.WithLabel
                                onCheckedChange={setSetting5Enabled}
                                checked={setting5Enabled}
                                size="small"
                                label="Enable option"
                            />
                            <Select
                                options={[{ label: "Option 1", value: "option1" }]}
                                onValueChange={() => {}}
                                size={5}
                                disabled={!setting5Enabled}
                            />
                        </div>
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Settings with overlays" defaultOpen>
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
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Settings with annotations" defaultOpen>
                    <SettingWrapper
                        label="First setting"
                        help={{
                            title: "First setting",
                            content: "This is the first setting.",
                        }}
                        errorAnnotation="Do not use large settings as inline - use stacked layout instead."
                    >
                        <Select onValueChange={() => {}} options={[]} size={5} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Second setting"
                        help={{
                            title: "Second setting",
                            content: "This is the second setting.",
                        }}
                        warningAnnotation="This is a warning annotation."
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Third setting"
                        help={{
                            title: "Third setting",
                            content: "This is the third setting.",
                        }}
                        infoAnnotation="This is an info annotation."
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}
