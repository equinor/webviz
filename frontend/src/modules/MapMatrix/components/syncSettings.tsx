import React from "react";

import { Switch } from "@lib/components/Switch";

import { SyncedSettings } from "../types";

type SyncSettingsProps = {
    syncedSettings: SyncedSettings;
    onChange: (syncedSettings: SyncedSettings) => void;
};

export const syncedSettingsLabels: { [key in keyof SyncedSettings]: string } = {
    ensemble: "Ensemble",
    name: "Name",
    attribute: "Surface attribute",
    timeOrInterval: "Time or Interval",
    realizationNum: "Realization",
};

export const SyncSettings: React.FC<SyncSettingsProps> = (props) => {
    function handleSyncedSettingsChange(key: keyof SyncedSettings, value: boolean) {
        const updatedSyncedSettings = { ...props.syncedSettings, [key]: value };
        props.onChange(updatedSyncedSettings);
    }

    return (
        <>
            {Object.keys(props.syncedSettings).map((key) => (
                <div className="flex gap-2" key={key}>
                    <Switch
                        checked={props.syncedSettings[key as keyof SyncedSettings]}
                        onChange={(e) => handleSyncedSettingsChange(key as keyof SyncedSettings, e.target.checked)}
                    />
                    {syncedSettingsLabels[key as keyof SyncedSettings]}
                </div>
            ))}
        </>
    );
};
