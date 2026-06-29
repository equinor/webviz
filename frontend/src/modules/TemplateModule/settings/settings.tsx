import React from "react";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Hidden } from "@lib/components/Hidden";
import { NumberInput } from "@lib/components/NumberInput";
import { Select } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { Switch } from "@lib/components/Switch";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { TextInput } from "@lib/components/TextInput";

import type { Interfaces } from "../interfaces";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [ensembles, setEnsembles] = React.useState<RegularEnsembleIdent[]>([]);
    const [setting4Enabled, setSetting4Enabled] = React.useState(false);
    const [setting5Enabled, setSetting5Enabled] = React.useState(false);
    const [showHiddenSettings, setShowHiddenSettings] = React.useState(false);

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="First setting group" defaultOpen>
                    <Setting.Field
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
                    </Setting.Field>
                    <Setting.Field
                        label="Second setting"
                        help={{
                            title: "Second setting",
                            content: "Smaller settings should be displayed in an inline layout.",
                        }}
                    >
                        <NumberInput value={0} onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
                        label="Second setting"
                        description="Use a stacked layout if a description is necessary - otherwise, move the description to the help section."
                        help={{
                            title: "Second setting",
                            content: "Smaller settings should be displayed in an inline layout.",
                        }}
                        stacked
                    >
                        <NumberInput value={0} onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
                        help={{
                            title: "Show other settings",
                            content: "This setting has no label or description. The input spans the whole width.",
                        }}
                    >
                        <SwitchCompositions.WithLabel
                            onCheckedChange={setShowHiddenSettings}
                            checked={showHiddenSettings}
                            label="Show other settings"
                        />
                    </Setting.Field>
                    <Hidden hidden={!showHiddenSettings} keepMounted>
                        <>
                            <Setting.Field
                                label="Setting with a pretty pretty long label"
                                help={{
                                    title: "Fourth setting",
                                    content: "An inline setting with enabling switch.",
                                }}
                            >
                                <div className="gap-x-xs flex">
                                    <Switch onCheckedChange={setSetting4Enabled} checked={setting4Enabled} />
                                    <NumberInput value={0} onValueChange={() => {}} disabled={!setting4Enabled} />
                                </div>
                            </Setting.Field>
                            <Setting.Field
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
                            </Setting.Field>
                        </>
                    </Hidden>
                </Setting.Section>
                <Setting.Section title="Settings with overlays" defaultOpen>
                    <Setting.Field
                        label="First setting"
                        help={{
                            title: "First setting",
                            content: "This is the first setting.",
                        }}
                        overlay={{ type: "info", message: "This is an informational overlay." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
                        label="Setting with a long label"
                        overlay={{ type: "warning", message: "This is a warning overlay." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
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
                    </Setting.Field>
                    <Setting.Field
                        label="Loading setting"
                        help={{
                            title: "Loading setting",
                            content: "This is a loading setting.",
                        }}
                        overlay={{ type: "loading" }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
                        label="Long running"
                        help={{
                            title: "Long running",
                            content: "This is a setting depending on a long running task.",
                        }}
                        overlay={{ type: "loading", message: "This task is taking longer than expected..." }}
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Settings with annotations" defaultOpen>
                    <Setting.Field
                        label="First setting"
                        help={{
                            title: "First setting",
                            content: "This is the first setting.",
                        }}
                        errorAnnotation="Do not use large settings as inline - use stacked layout instead."
                    >
                        <Select onValueChange={() => {}} options={[]} size={5} />
                    </Setting.Field>
                    <Setting.Field
                        label="Second setting"
                        help={{
                            title: "Second setting",
                            content: "This is the second setting.",
                        }}
                        warningAnnotation="This is a warning annotation."
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                    <Setting.Field
                        label="Third setting"
                        help={{
                            title: "Third setting",
                            content: "This is the third setting.",
                        }}
                        infoAnnotation="This is an info annotation."
                    >
                        <TextInput value="" onValueChange={() => {}} />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
