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
import { DataProvider, isDataProvider } from "../DataProvider/DataProvider";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { OperationGroup } from "./OperationGroup";
import { OperationGroupStatus, OperationGroupTopic } from "./OperationGroup";
import { OperationGroupDataProvidersComponent } from "./_privateComponents/DataProvidersComponent";

export type OperationGroupComponentProps = {
    operationGroup: OperationGroup<any, any>;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function OperationGroupComponent(props: OperationGroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const childProviders = usePublishSubscribeTopicValue(
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
    const errorMessage = usePublishSubscribeTopicValue(props.operationGroup, OperationGroupTopic.ERROR_MESSAGE);
    const readableOperationString = usePublishSubscribeTopicValue(
        props.operationGroup,
        OperationGroupTopic.READABLE_OPERATION_STRING,
    );

    let color = props.operationGroup.getGroupDelegate().getColor();
    if (status === OperationGroupStatus.ERROR) {
        color = "rgba(255, 0, 0, 0.1)";
    } else if (status === OperationGroupStatus.INSUFFICIENT_CHILDREN) {
        color = "rgba(255, 165, 0, 0.1)";
    } else if (
        status === OperationGroupStatus.CHILDREN_OF_DIFFERENT_TYPES ||
        status === OperationGroupStatus.UNSUPPORTED_CHILDREN ||
        status === OperationGroupStatus.TOO_MANY_CHILDREN ||
        status === OperationGroupStatus.INVALID_SETTINGS
    ) {
        color = "rgba(255, 0, 0, 0.1)";
    }

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
            return (
                <Tooltip title={errorMessage?.toString()}>
                    <Rule className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.UNSUPPORTED_CHILDREN) {
            return (
                <Tooltip title={errorMessage?.toString()}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.INSUFFICIENT_CHILDREN) {
            return (
                <Tooltip title={errorMessage?.toString()}>
                    <Rule className="text-orange-500 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.TOO_MANY_CHILDREN) {
            return (
                <Tooltip title={errorMessage?.toString()}>
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </Tooltip>
            );
        }
        if (status === OperationGroupStatus.INVALID_SETTINGS) {
            return (
                <Tooltip title={errorMessage?.toString()}>
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

    function makeContent() {
        if (childProviders.length === 0) {
            return <EmptyContent>{makePlaceholder()}</EmptyContent>;
        }
        if (childProviders.some((child) => !isDataProvider(child))) {
            return <EmptyContent>Unsupported child item found. Please check the error message.</EmptyContent>;
        }
        return <OperationGroupDataProvidersComponent dataProviders={childProviders as DataProvider<any, any>[]} />;
    }

    return (
        <SortableListGroup
            key={props.operationGroup.getItemDelegate().getId()}
            id={props.operationGroup.getItemDelegate().getId()}
            title={<EditName item={props.operationGroup} />}
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
            endAdornment={
                <>
                    <span className="whitespace-nowrap">{readableOperationString}</span>
                    {makeEndAdornment()}
                </>
            }
            contentWhenEmpty={<EmptyContent>{makePlaceholder()}</EmptyContent>}
            expanded={isExpanded}
        >
            {makeContent()}
        </SortableListGroup>
    );
}
