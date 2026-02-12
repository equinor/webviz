import React from "react";

import { Block, CheckCircle, Error, Rule } from "@mui/icons-material";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { SortableList } from "@lib/components/SortableList";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { SortableListGroup } from "../../components/group";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { Operation } from "../../interfacesAndTypes/customOperationGroupImplementation";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import { OperationGroupStatus, OperationGroupTopic, type OperationGroup } from "./OperationGroup";

export type OperationGroupComponentProps = {
    operationGroup: OperationGroup<any, any>;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function OperationGroupComponent(props: OperationGroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(
        props.operationGroup.getGroupDelegate(),
        GroupDelegateTopic.CHILDREN,
    );
    const isExpanded = usePublishSubscribeTopicValue(
        props.operationGroup.getItemDelegate(),
        ItemDelegateTopic.EXPANDED,
    );
    const operation = usePublishSubscribeTopicValue(props.operationGroup, OperationGroupTopic.OPERATION);
    const status = usePublishSubscribeTopicValue(props.operationGroup, OperationGroupTopic.STATUS);
    const progressMessage = usePublishSubscribeTopicValue(props.operationGroup, OperationGroupTopic.PROGRESS_MESSAGE);

    const color = props.operationGroup.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.operationGroup);
    }, [props.operationGroup, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.operationGroup);
        }
    }

    function makeStatus(): React.ReactNode {
        if (status === OperationGroupStatus.LOADING) {
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
        if (status === OperationGroupStatus.ERROR) {
            const error = props.operationGroup.getError();
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
        if (status === OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES) {
            const errorMessage = "Children are of different types, cannot perform operation.";

            return (
                <Tooltip title={errorMessage}>
                    <Rule className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.UNSUPPORTED_CHILDREN) {
            const errorMessage = "One or more children are not supported by this operation.";

            return (
                <Tooltip title={errorMessage}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.INSUFFICIENT_CHILDREN) {
            const errorMessage = "Not enough children to perform operation.";

            return (
                <Tooltip title={errorMessage}>
                    <Rule className="text-orange-500 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.TOO_MANY_CHILDREN) {
            const errorMessage = "Too many children for this operation.";

            return (
                <Tooltip title={errorMessage}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.INVALID_SETTINGS) {
            const errorMessage = "Invalid settings";

            return (
                <Tooltip title={errorMessage}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.SUCCESS) {
            return (
                <Tooltip title="Successfully loaded">
                    <CheckCircle className="text-green-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        return null;
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        adornment.push(makeStatus());
        if (props.operationGroup.getGroupDelegate().findChildren((item) => isDataProvider(item)).length < 2) {
            adornment.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        }
        adornment.push(<ExpandCollapseAllButton key="expand-collapse" group={props.operationGroup} />);
        adornment.push(<RemoveItemButton key="remove" item={props.operationGroup} />);
        return adornment;
    }

    function makePlaceholder() {
        switch (operation) {
            case Operation.DELTA:
                return "Drag exactly two data providers of the same type inside to calculate the difference between them.";
            default: {
                const _exhaustiveCheck: never = operation;
                return _exhaustiveCheck;
            }
        }
    }

    function makeSetting(setting: SettingManager<any>) {
        const manager = props.operationGroup.getItemDelegate().getDataProviderManager();
        if (!manager) {
            return null;
        }
        return (
            <SettingManagerComponent key={setting.getId()} setting={setting} manager={manager} sharedSetting={false} />
        );
    }

    function makeSettings(settings: SettingManager<any>[]): React.ReactNode[] {
        const settingNodes: React.ReactNode[] = [];
        for (const setting of settings) {
            settingNodes.push(makeSetting(setting));
        }
        return settingNodes;
    }

    return (
        <SortableListGroup
            key={props.operationGroup.getItemDelegate().getId()}
            id={props.operationGroup.getItemDelegate().getId()}
            title={props.operationGroup.getItemDelegate().getName()}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={
                <div className="flex items-center gap-2">
                    <VisibilityToggle item={props.operationGroup} />
                </div>
            }
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>{makePlaceholder()}</EmptyContent>}
            expanded={isExpanded}
            content={
                props.operationGroup.getSharedSettingsDelegate() ? (
                    <SortableList.NoDropZone>
                        <div className="!bg-slate-100 border text-xs gap-2 grid grid-cols-[auto_1fr] items-center">
                            {makeSettings(Object.values(props.operationGroup.getWrappedSettings()))}
                        </div>
                    </SortableList.NoDropZone>
                ) : undefined
            }
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
