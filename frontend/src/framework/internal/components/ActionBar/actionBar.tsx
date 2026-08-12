import { Close, Link } from "@mui/icons-material";

import { GRID_PROPERTY_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/gridProperty";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import {
    ElevatedSettingInstanceTopic,
    type ElevatedSettingInstance,
} from "@framework/ElevatedSettings/ElevatedSettingInstance";
import { useElevatedSettingInstances } from "@framework/ElevatedSettings/ElevatedSettingsService";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
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
    [GRID_PROPERTY_ELEVATED_SETTING.key]: "Grid property",
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

    return (
        <>
            <Separator orientation="vertical" />
            <div className="gap-x-2xs flex items-center">
                {Array.from(elevatedSettingInstances.entries()).map(([key, instance]) => {
                    const handleRemoveClick = () => service.removeSetting(instance.getDefinition());

                    if (key === REALIZATION_ELEVATED_SETTING.key) {
                        return (
                            <ElevatedSettingChip key={key} onRemove={handleRemoveClick}>
                                <RealizationElevatedSettingContent instance={instance} />
                            </ElevatedSettingChip>
                        );
                    }

                    if (key === GRID_PROPERTY_ELEVATED_SETTING.key) {
                        return (
                            <ElevatedSettingChip key={key} onRemove={handleRemoveClick}>
                                <GridPropertyElevatedSettingContent instance={instance} />
                            </ElevatedSettingChip>
                        );
                    }

                    const label = ELEVATED_SETTING_LABELS[key] ?? key;
                    const value = instance.getValue();
                    const valueAsString = value === null || value === undefined ? "Not set" : String(value);

                    return (
                        <ElevatedSettingChip key={key} onRemove={handleRemoveClick}>
                            {label}: {valueAsString}
                        </ElevatedSettingChip>
                    );
                })}
            </div>
        </>
    );
}

type ElevatedSettingChipProps = {
    onRemove: () => void;
    children: React.ReactNode;
};

// The link icon and remove button are the same for every elevated setting - only the label/control
// in between (`children`) differs per setting.
function ElevatedSettingChip(props: ElevatedSettingChipProps) {
    return (
        <Tooltip content="Elevated dashboard setting" side="bottom">
            <div className="gap-x-3xs px-2xs py-4xs bg-accent-subtle text-accent-strong text-body-xs flex items-center rounded-full">
                <Link fontSize="inherit" />
                {props.children}
                <div
                    role="button"
                    aria-label="Remove elevated setting"
                    onClick={props.onRemove}
                    className="hover:bg-accent hover:text-accent-strong-on-emphasis flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full"
                >
                    <Close fontSize="inherit" />
                </div>
            </div>
        </Tooltip>
    );
}

type RealizationElevatedSettingContentProps = {
    instance: ElevatedSettingInstance<number | null, readonly number[]>;
};

function RealizationElevatedSettingContent(props: RealizationElevatedSettingContentProps) {
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
        <>
            <span className="text-body-xs shrink-0">Realization</span>
            <Combobox
                size="small"
                items={items}
                value={value}
                onValueChange={handleValueChange}
                placeholder="Not set"
                layoutClassName="w-24"
            />
        </>
    );
}

type GridPropertyElevatedSettingContentProps = {
    instance: ElevatedSettingInstance<string | null, readonly string[]>;
};

function GridPropertyElevatedSettingContent(props: GridPropertyElevatedSettingContentProps) {
    const value = usePublishSubscribeTopicValue(props.instance, ElevatedSettingInstanceTopic.VALUE);
    const constraints = usePublishSubscribeTopicValue(props.instance, ElevatedSettingInstanceTopic.CONSTRAINTS);

    const items: ComboboxItem<string | null>[] = constraints.map((propertyName) => ({
        value: propertyName,
        label: propertyName,
    }));

    function handleValueChange(newValue: string | null) {
        props.instance.setValue(newValue);
    }

    return (
        <>
            <span className="text-body-xs shrink-0">Grid property</span>
            <Combobox
                size="small"
                items={items}
                value={value}
                onValueChange={handleValueChange}
                placeholder="Not set"
                layoutClassName="w-32"
            />
        </>
    );
}
