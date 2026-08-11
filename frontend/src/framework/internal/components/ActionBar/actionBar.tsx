import React from "react";

import { Link } from "@mui/icons-material";

import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import {
    ElevatedSettingInstanceTopic,
    type ElevatedSettingInstance,
} from "@framework/ElevatedSettings/ElevatedSettingInstance";
import { useElevatedSettingInstances } from "@framework/ElevatedSettings/ElevatedSettingsService";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { useActiveSession } from "../ActiveSessionBoundary";

import { StartPanel } from "./_panels/start";

// Elevated settings have no display metadata of their own; map key -> label here.
const ELEVATED_SETTING_LABELS: Record<string, string> = {
    [REALIZATION_ELEVATED_SETTING.key]: "Realization",
};

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    const session = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(session, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    if (isSnapshot) {
        return null;
    }

    return (
        <div className="border-b-neutral-subtle bg-surface/30 px-xs py-3xs shadow-elevation-raised flex items-center border-b-2">
            <StartPanel workbench={props.workbench} />
            <ElevatedSettingsIndicator />
        </div>
    );
}

function ElevatedSettingsIndicator() {
    const dashboard = useActiveDashboard();
    const service = dashboard.getElevatedSettingsService();
    const elevatedSettingInstances = useElevatedSettingInstances(service);

    const isRealizationElevated = elevatedSettingInstances.has(REALIZATION_ELEVATED_SETTING.key);

    // Temporary: automatically elevate the realization setting so the indicator has something to show.
    // Remove once there is a real UI flow for elevating dashboard settings.
    React.useEffect(
        function autoAddRealizationElevatedSetting() {
            if (!service.hasSetting(REALIZATION_ELEVATED_SETTING)) {
                service.addSetting(REALIZATION_ELEVATED_SETTING);
            }
        },
        [service],
    );

    function handleAddRealizationClick() {
        if (!service.hasSetting(REALIZATION_ELEVATED_SETTING)) {
            service.addSetting(REALIZATION_ELEVATED_SETTING);
        }
    }

    function handleRemoveRealizationClick() {
        service.removeSetting(REALIZATION_ELEVATED_SETTING);
    }

    return (
        <>
            <Separator orientation="vertical" />
            <div className="gap-x-2xs flex items-center">
                {Array.from(elevatedSettingInstances.entries()).map(([key, instance]) => {
                    if (key === REALIZATION_ELEVATED_SETTING.key) {
                        return <RealizationElevatedSettingChip key={key} instance={instance} />;
                    }

                    const label = ELEVATED_SETTING_LABELS[key] ?? key;
                    const value = instance.getValue();
                    const valueAsString = value === null || value === undefined ? "Not set" : String(value);

                    return (
                        <Tooltip key={key} content="Elevated dashboard setting" side="bottom">
                            <span className="gap-x-3xs px-2xs py-4xs bg-accent-subtle text-accent-strong text-body-xs flex items-center rounded-full">
                                <Link fontSize="inherit" />
                                {label}: {valueAsString}
                            </span>
                        </Tooltip>
                    );
                })}
                <Button
                    size="small"
                    variant="outlined"
                    tone="accent"
                    disabled={isRealizationElevated}
                    onClick={handleAddRealizationClick}
                >
                    Add realization
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    tone="danger"
                    disabled={!isRealizationElevated}
                    onClick={handleRemoveRealizationClick}
                >
                    Remove realization
                </Button>
            </div>
        </>
    );
}

type RealizationElevatedSettingChipProps = {
    instance: ElevatedSettingInstance<number | null, readonly number[]>;
};

function RealizationElevatedSettingChip(props: RealizationElevatedSettingChipProps) {
    const value = usePublishSubscribeTopicValue(props.instance, ElevatedSettingInstanceTopic.VALUE);
    const constraints = usePublishSubscribeTopicValue(props.instance, ElevatedSettingInstanceTopic.CONSTRAINTS);

    const items: ComboboxItem<number | null>[] = constraints.map((realization) => ({
        value: realization,
        label: realization.toString(),
    }));

    function handleValueChange(newValue: number | null) {
        props.instance.setValue(newValue);
    }

    return (
        <Tooltip content="Elevated dashboard setting" side="bottom">
            <div className="gap-x-3xs text-accent-strong flex items-center">
                <Link fontSize="inherit" />
                <span className="text-body-xs shrink-0">Realization</span>
                <Combobox
                    size="small"
                    items={items}
                    value={value}
                    onValueChange={handleValueChange}
                    placeholder="Not set"
                    layoutClassName="w-24"
                />
            </div>
        </Tooltip>
    );
}
