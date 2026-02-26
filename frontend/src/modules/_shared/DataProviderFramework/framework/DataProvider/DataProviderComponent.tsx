import type React from "react";

import { Block, CheckCircle, Difference, Error, ExpandLess, ExpandMore } from "@mui/icons-material";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListItem } from "../../components/item";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";

import { DataProviderStatus, DataProviderTopic } from "./DataProvider";
import type { DataProvider } from "./DataProvider";

export type DataProviderComponentProps = {
    dataProvider: DataProvider<any, any>;
};

export function DataProviderComponent(props: DataProviderComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.dataProvider.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const isSubordinated = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.SUBORDINATED);
    const subordinationPrefix = usePublishSubscribeTopicValue(
        props.dataProvider,
        DataProviderTopic.SUBORDINATION_PREFIX,
    );

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
        const elevatedSettingKeys = isSubordinated
            ? new Set(props.dataProvider.getSettingsContextDelegate().getElevatableSettings() as string[])
            : null;

        const settingNodes: React.ReactNode[] = [];
        for (const key of Object.keys(settings)) {
            if (elevatedSettingKeys?.has(key)) {
                continue;
            }
            settingNodes.push(makeSetting(settings[key]));
        }
        return settingNodes;
    }

    return (
        <SortableListItem
            key={props.dataProvider.getItemDelegate().getId()}
            id={props.dataProvider.getItemDelegate().getId()}
            title={
                <div className="flex gap-2 items-center">
                    {subordinationPrefix}
                    <EditName item={props.dataProvider} />
                </div>
            }
            startAdornment={<StartActions dataProvider={props.dataProvider} />}
            endAdornment={<EndActions dataProvider={props.dataProvider} />}
        >
            <div
                className={resolveClassNames(
                    "grid grid-cols-[auto_1fr] items-stretch text-xs border [&>*:nth-child(4n-3)]:bg-slate-50 [&>*:nth-child(4n-2)]:bg-slate-50",
                    {
                        hidden: !isExpanded,
                    },
                )}
            >
                {makeSettings(props.dataProvider.getSettingsContextDelegate().getSettings())}
            </div>
        </SortableListItem>
    );
}

type StartActionProps = {
    dataProvider: DataProvider<any, any>;
};

function StartActions(props: StartActionProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.dataProvider.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const isSubordinated = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.SUBORDINATED);

    function handleToggleExpanded() {
        props.dataProvider.getItemDelegate().setExpanded(!isExpanded);
    }
    return (
        <div className="flex items-center">
            <DenseIconButton onClick={handleToggleExpanded} title={isExpanded ? "Hide settings" : "Show settings"}>
                {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </DenseIconButton>
            {!isSubordinated && <VisibilityToggle item={props.dataProvider} />}
        </div>
    );
}

type EndActionProps = {
    dataProvider: DataProvider<any, any>;
};

function EndActions(props: EndActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.STATUS);
    const progressMessage = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.PROGRESS_MESSAGE);
    const isSubordinated = usePublishSubscribeTopicValue(props.dataProvider, DataProviderTopic.SUBORDINATED);

    function makeStatus(): React.ReactNode {
        if (isSubordinated) {
            return (
                <Tooltip title="Subordinated">
                    <Difference fontSize="small" />
                </Tooltip>
            );
        }
        if (status === DataProviderStatus.LOADING) {
            return (
                <Tooltip title={progressMessage ?? "Loading"}>
                    <div className="flex gap-2 min-w-0 items-center">
                        <span className="overflow-hidden whitespace-nowrap min-w-0 text-ellipsis">
                            {progressMessage}
                        </span>
                        <CircularProgress size="extra-small" />
                    </div>
                </Tooltip>
            );
        }
        if (status === DataProviderStatus.ERROR) {
            const error = props.dataProvider.getError();
            if (!error) {
                return (
                    <Tooltip title="Error">
                        <Error className="text-red-700 p-0.5" fontSize="small" />
                    </Tooltip>
                );
            }

            if (typeof error === "string") {
                return (
                    <Tooltip title={error}>
                        <div className="text-red-700 p-0.5">
                            <Error fontSize="small" />
                        </div>
                    </Tooltip>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <Tooltip title={statusMessage.message}>
                        <Error className="text-red-700 p-0.5" fontSize="small" />
                    </Tooltip>
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

            const customReportedErrors = props.dataProvider.getSettingsErrorMessages();
            if (customReportedErrors.length > 0) {
                errorMessage += `\n${customReportedErrors.join("\n")}`;
            }
            errorMessage += "\nPlease check the settings.";

            return (
                <Tooltip title={errorMessage}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === DataProviderStatus.SUCCESS) {
            return (
                <Tooltip title="Successfully loaded">
                    <CheckCircle className="text-green-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        return null;
    }

    return (
        <>
            {makeStatus()}
            <RemoveItemButton item={props.dataProvider} />
        </>
    );
}
