import type React from "react";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { Tooltip } from "@lib/components/Tooltip";
import { Block, CheckCircle, Difference, Error, ExpandLess, ExpandMore } from "@lib/mui-icons";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListItem } from "../../components/item";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { ErrorBadge } from "../utilityComponents/ErrorBadge";
import { ErrorOverlay } from "../utilityComponents/ErrorOverlay";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { StatusMessages } from "../utilityComponents/StatusWriterMessages";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";

import { DataProviderStatus, DataProviderTopic } from "./DataProvider";
import type { DataProvider } from "./DataProvider";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";

export type DataProviderComponentProps = {
    dataProvider: DataProvider<any, any>;
};

export function DataProviderComponent(props: DataProviderComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.dataProvider.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function makeSetting(setting: SettingManager<any>) {
        const manager = props.dataProvider.getItemDelegate().getDataProviderManager();

        if (!manager) {
            return null;
        }
        return (
            <SettingManagerComponent key={setting.getId()} setting={setting} manager={manager} sharedSetting={false} />
        );
    }

    function makeSettings(settings: Record<string, SettingManager<any>>): React.ReactNode[] {
        const settingNodes: React.ReactNode[] = [];
        for (const key of Object.keys(settings)) {
            settingNodes.push(makeSetting(settings[key]));
        }
        return settingNodes;
    }

    return (
        <SortableListItem
            key={props.dataProvider.getItemDelegate().getId()}
            id={props.dataProvider.getItemDelegate().getId()}
            title={<EditName item={props.dataProvider} />}
            startAdornment={<StartActions dataProvider={props.dataProvider} />}
            endAdornment={<EndActions dataProvider={props.dataProvider} />}
        >
            <div className="bg-surface relative">
                <ErrorOverlay itemDelegate={props.dataProvider.getItemDelegate()} isExpanded={isExpanded} />
                <div
                    className={resolveClassNames(
                        "[&>*:nth-child(4n-2)]:bg-canvas [&>*:nth-child(4n-3)]:bg-canvas text-body-sm border-neutral-subtle grid grid-cols-[auto_1fr] items-stretch border",
                        {
                            hidden: !isExpanded,
                        },
                    )}
                >
                    {makeSettings(props.dataProvider.getSettingsContextDelegate().getSettings())}
                </div>
            </div>
        </SortableListItem>
    );
}

type StartActionProps = {
    dataProvider: DataProvider<any, any>;
};

function StartActions(props: StartActionProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.dataProvider.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function handleToggleExpanded() {
        props.dataProvider.getItemDelegate().setExpanded(!isExpanded);
    }
    return (
        <div className="flex items-center">
            <TooltipCompositions.Default content={isExpanded ? "Hide settings" : "Show settings"} side="bottom">
                <Button onClick={handleToggleExpanded} variant="ghost" tone="neutral" size="small" iconOnly>
                    {isExpanded ? <ExpandLess size={16} /> : <ExpandMore size={16} />}
                </Button>
            </TooltipCompositions.Default>
            <VisibilityToggle item={props.dataProvider} />
        </div>
    );
}

type EndActionProps = {
    dataProvider: DataProvider<any, any>;
};

function EndActions(props: EndActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.STATUS);
    const statusMessages = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.STATUS_MESSAGES);
    const progressMessage = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.PROGRESS_MESSAGE);
    const isSubordinated = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.SUBORDINATED);
    const deserializationErrors = usePublishSubscribeTopicValue(
        props.dataProvider.getItemDelegate(),
        ItemDelegateTopic.DESERIALIZATION_ERRORS,
    );

    function makeStatus(): React.ReactNode {
        if (isSubordinated) {
            return (
                <TooltipCompositions.Default content="Subordinated" side="bottom">
                    <Difference size={16} />
                </TooltipCompositions.Default>
            );
        }
        if (status === DataProviderStatus.LOADING) {
            return (
                <TooltipCompositions.Default content={progressMessage ?? "Loading"} side="bottom">
                    <div className="gap-horizontal-2xs flex min-w-0 items-center">
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                            {progressMessage}
                        </span>
                        <CircularProgress size={16} />
                    </div>
                </TooltipCompositions.Default>
            );
        }
        if (status === DataProviderStatus.ERROR) {
            const error = props.dataProvider.getError();
            if (!error) {
                return (
                    <TooltipCompositions.Default content="Error" side="bottom">
                        <Error className="text-danger-subtle" size={16} />
                    </TooltipCompositions.Default>
                );
            }

            if (typeof error === "string") {
                return (
                    <TooltipCompositions.Default content={error} side="bottom">
                        <Error className="text-danger-subtle" size={16} />
                    </TooltipCompositions.Default>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <TooltipCompositions.Default content={statusMessage.message} side="bottom">
                        <Error className="text-danger-subtle" size={16} />
                    </TooltipCompositions.Default>
                );
            }
        }
        if (status === DataProviderStatus.INVALID_SETTINGS) {
            let errorMessage = "Invalid settings";
            const invalidSettings = props.dataProvider.getSettingsContextDelegate().getInvalidSettings();

            if (invalidSettings.length > 0) {
                errorMessage += `: ${invalidSettings.join(", ")}`;
            }
            errorMessage += ".";

            errorMessage += "\nPlease check the settings.";

            return (
                <TooltipCompositions.Default content={errorMessage} side="bottom">
                    <Block className="text-danger-subtle" size={16} />
                </TooltipCompositions.Default>
            );
        }
        if (status === DataProviderStatus.SUCCESS) {
            return (
                <TooltipCompositions.Default content="Successfully loaded" side="bottom">
                    <CheckCircle className="text-success-subtle" size={16} />
                </TooltipCompositions.Default>
            );
        }
        return null;
    }

    let deserializationErrorBadge: React.ReactNode = null;
    if (deserializationErrors.length > 0) {
        deserializationErrorBadge = <ErrorBadge numErrors={deserializationErrors.length} />;
    }

    return (
        <>
            {deserializationErrorBadge}
            <StatusMessages statusMessages={statusMessages} />
            {makeStatus()}
            <RemoveItemButton item={props.dataProvider} />
        </>
    );
}
