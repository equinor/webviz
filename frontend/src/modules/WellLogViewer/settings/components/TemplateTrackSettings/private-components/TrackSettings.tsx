import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Input } from "@lib/components/Input";
import { TemplateTrackConfig } from "@modules/WellLogViewer/types";

import { ContinousTrackSettings } from "../ContinousTrackSettings";
import { DiscreteTrackSettings } from "../DiscreteTrackSettings";

export type TrackSettingsProps = {
    trackConfig: TemplateTrackConfig;
    statusWriter: SettingsStatusWriter;
    onUpdateTrack: (newTrack: TemplateTrackConfig) => void;
};

export type TrackSettingFragmentProps = {
    trackConfig: TemplateTrackConfig;
    statusWriter: SettingsStatusWriter;
    onFieldChange: (changes: Partial<TemplateTrackConfig>) => void;
};

const INPUT_DEBOUNCE_TIME = 500;

export function TrackSettings(props: TrackSettingsProps): React.ReactNode {
    const { onUpdateTrack } = props;

    const applyConfigChange = React.useCallback(
        function applyConfigChange(configChanges: Partial<TemplateTrackConfig>) {
            onUpdateTrack({ ...props.trackConfig, ...configChanges } as TemplateTrackConfig);
        },
        [props.trackConfig, onUpdateTrack]
    );

    return (
        <div className="pl-3 p-2 grid grid-cols-2 gap-x-2 gap-y-3 items-center text-sm">
            <label htmlFor="trackTitle">Track title</label>
            <Input
                id="trackTitle"
                value={props.trackConfig.title}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => applyConfigChange({ title: val })}
            />

            <label htmlFor="trackWidth">Track width </label>
            <Input
                id="trackWidth"
                type="number"
                value={props.trackConfig.width}
                min={1}
                max={6}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => applyConfigChange({ width: Number(val) })}
            />

            {makeTypeSpecificFragment({
                trackConfig: props.trackConfig,
                statusWriter: props.statusWriter,
                onFieldChange: applyConfigChange,
            })}
        </div>
    );
}

function makeTypeSpecificFragment(props: TrackSettingFragmentProps) {
    if (props.trackConfig._type === "discrete") return <DiscreteTrackSettings {...props} />;
    else return <ContinousTrackSettings {...props} />;
}
