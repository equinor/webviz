import type React from "react";

import { Add, Close, Delete, Tune } from "@mui/icons-material";

import {
    useDashboardSettingInstances,
    useDashboardSettingInstanceTopic,
} from "@framework/DashboardSettings/adapters/react";
import {
    DashboardSettingInstanceTopic,
    DashboardSettingValueSource,
    type DashboardSettingInstance,
} from "@framework/DashboardSettings/DashboardSettingInstance";
import { DashboardSettingRegistry } from "@framework/DashboardSettings/DashboardSettingRegistry";
import type { DashboardSettingsService } from "@framework/DashboardSettings/DashboardSettingsService";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Setting, type SettingAnnotation } from "@lib/components/Setting";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";

export type DashboardSettingsPanelProps = {
    onClose: () => void;
};

export function DashboardSettingsPanel(props: DashboardSettingsPanelProps): React.ReactNode {
    const dashboard = useActiveDashboard();
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const dashboardSettingsService = dashboard.getDashboardSettingsService();
    const activeInstances = useDashboardSettingInstances(dashboardSettingsService);

    return (
        <div className="border-accent-subtle shadow-elevation-raised flex max-h-[40%] min-h-0 shrink-0 flex-col border-b-2">
            <div className="gap-x-xs pr-2xs pl-xs bg-accent-canvas border-b-neutral-subtle flex h-10 shrink-0 items-center border-b">
                <Tune fontSize="small" />
                <span className="text-body-sm font-bolder grow">Dashboard settings</span>
                <AddDashboardSettingMenu
                    dashboardSettingsService={dashboardSettingsService}
                    activeInstances={activeInstances}
                    disabled={isSnapshot}
                />
                <Tooltip content="Close dashboard settings panel">
                    <Button size="small" tone="neutral" iconOnly variant="ghost" onClick={props.onClose}>
                        <Close />
                    </Button>
                </Tooltip>
            </div>
            {/* Alternating row backgrounds, like in Setting.Section - the rows are the children of Setting.Panel's grid */}
            <div className="pt-xs [&>div>.setting-row:nth-child(even_of_.setting-row)]:bg-neutral/20 min-h-0 overflow-y-auto">
                {activeInstances.length === 0 ? (
                    <div className="py-sm text-center">No dashboard settings yet - add one with +</div>
                ) : (
                    <Setting.Panel>
                        {activeInstances.map((instance) => (
                            <DashboardSettingField
                                key={instance.getDefinition().key}
                                instance={instance}
                                onRemove={() => dashboardSettingsService.removeSetting(instance.getDefinition())}
                                removeDisabled={isSnapshot}
                            />
                        ))}
                    </Setting.Panel>
                )}
            </div>
        </div>
    );
}

type AddDashboardSettingMenuProps = {
    dashboardSettingsService: DashboardSettingsService;
    activeInstances: readonly DashboardSettingInstance<any, any>[];
    disabled: boolean;
};

function AddDashboardSettingMenu(props: AddDashboardSettingMenuProps): React.ReactNode {
    const activeKeys = new Set(props.activeInstances.map((instance) => instance.getDefinition().key));
    const availableDefinitions = DashboardSettingRegistry.getRegisteredSettings().filter(
        (definition) => !activeKeys.has(definition.key),
    );

    const isDisabled = props.disabled || availableDefinitions.length === 0;

    let title = "Add a dashboard setting";
    if (props.disabled) {
        title = "Dashboard settings cannot be changed in snapshot mode";
    } else if (availableDefinitions.length === 0) {
        title = "All available dashboard settings are already added";
    }

    return (
        <Menu.Root>
            <Tooltip content={title}>
                <span>
                    <Menu.Trigger disabled={isDisabled}>
                        <Button
                            aria-label="Add a dashboard setting"
                            focusableWhenDisabled
                            iconOnly
                            size="small"
                            tone="neutral"
                            variant="ghost"
                        >
                            <Add fontSize="inherit" />
                        </Button>
                    </Menu.Trigger>
                </span>
            </Tooltip>
            <Menu.Popup>
                {availableDefinitions.map((definition) => (
                    <Menu.Item
                        key={definition.key}
                        text={definition.label}
                        onClick={() => props.dashboardSettingsService.addSetting(definition)}
                    />
                ))}
            </Menu.Popup>
        </Menu.Root>
    );
}

type DashboardSettingFieldProps = {
    instance: DashboardSettingInstance<any, any>;
    onRemove: () => void;
    removeDisabled: boolean;
};

function DashboardSettingField(props: DashboardSettingFieldProps): React.ReactNode {
    const definition = props.instance.getDefinition();

    const value = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.VALUE);
    const valueSource = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.VALUE_SOURCE);
    const isValueValid = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.IS_VALUE_VALID);
    const constraints = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.CONSTRAINTS);
    const isSettling = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.IS_SETTLING);
    const sourceCount = useDashboardSettingInstanceTopic(props.instance, DashboardSettingInstanceTopic.SOURCE_COUNT);

    const annotations: SettingAnnotation[] = [];
    if (sourceCount === 0) {
        annotations.push({ type: "info", message: "Not used by any module on this dashboard." });
    } else if (!isValueValid && !isSettling) {
        annotations.push({
            type: "error",
            message:
                valueSource === DashboardSettingValueSource.RESTORED
                    ? "The restored value is invalid. Please choose a valid value."
                    : "The current value is invalid. Please choose a valid value.",
        });
    }

    return (
        <Setting.Field label={definition.label} annotations={annotations} loadingOverlay={isSettling ?? false}>
            <div className="gap-x-2xs flex min-h-8 items-center">
                <div className="min-w-0 grow">
                    <definition.Component
                        value={value}
                        constraints={constraints}
                        isValueValid={isValueValid ?? true}
                        isSettling={isSettling ?? false}
                        onValueChange={(newValue: unknown) => props.instance.setValue(newValue)}
                    />
                </div>
                <Tooltip content={`Remove "${definition.label}" from the dashboard settings`} side="right">
                    <Button
                        aria-label={`Remove ${definition.label}`}
                        disabled={props.removeDisabled}
                        focusableWhenDisabled
                        iconOnly
                        onClick={props.onRemove}
                        size="small"
                        tone="danger"
                        variant="ghost"
                    >
                        <Delete />
                    </Button>
                </Tooltip>
            </div>
        </Setting.Field>
    );
}
