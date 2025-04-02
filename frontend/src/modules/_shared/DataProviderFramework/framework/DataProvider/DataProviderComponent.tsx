import type React from "react";

import type { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Block, CheckCircle, Difference, Error, ExpandLess, ExpandMore } from "@mui/icons-material";

import type { DataProvider } from "./DataProvider";
import { DataProviderStatus, LayerDelegateTopic } from "./DataProvider";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";

export type DataProviderComponentProps = {
    layer: DataProvider<any, any>;
};

export function DataProviderComponent(props: DataProviderComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.layer.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function makeSetting(setting: SettingManager<any>) {
        const manager = props.layer.getItemDelegate().getLayerManager();
        if (!manager) {
            return null;
        }
        return <SettingComponent key={setting.getId()} setting={setting} manager={manager} sharedSetting={false} />;
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
            key={props.layer.getItemDelegate().getId()}
            id={props.layer.getItemDelegate().getId()}
            title={<EditName item={props.layer} />}
            startAdornment={<StartActions layer={props.layer} />}
            endAdornment={<EndActions layer={props.layer} />}
        >
            <div
                className={resolveClassNames("grid grid-cols-[auto_1fr] items-center text-xs border", {
                    hidden: !isExpanded,
                })}
            >
                {makeSettings(props.layer.getSettingsContextDelegate().getSettings())}
            </div>
        </SortableListItem>
    );
}

type StartActionProps = {
    layer: DataProvider<any, any>;
};

function StartActions(props: StartActionProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.layer.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function handleToggleExpanded() {
        props.layer.getItemDelegate().setExpanded(!isExpanded);
    }
    return (
        <div className="flex items-center">
            <DenseIconButton onClick={handleToggleExpanded} title={isExpanded ? "Hide settings" : "Show settings"}>
                {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </DenseIconButton>
            <VisibilityToggle item={props.layer} />
        </div>
    );
}

type EndActionProps = {
    layer: DataProvider<any, any>;
};

function EndActions(props: EndActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.layer, LayerDelegateTopic.STATUS);
    const isSubordinated = usePublishSubscribeTopicValue(props.layer, LayerDelegateTopic.SUBORDINATED);

    function makeStatus(): React.ReactNode {
        if (isSubordinated) {
            return (
                <div title="Subordinated">
                    <Difference fontSize="small" />
                </div>
            );
        }
        if (status === DataProviderStatus.LOADING) {
            return (
                <div title="Loading">
                    <CircularProgress size="extra-small" />
                </div>
            );
        }
        if (status === DataProviderStatus.ERROR) {
            const error = props.layer.getError();
            if (typeof error === "string") {
                return (
                    <div title={error} className="text-red-700 p-0.5">
                        <Error fontSize="small" />
                    </div>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <div title={statusMessage.message}>
                        <Error className="text-red-700 p-0.5" fontSize="small" />
                    </div>
                );
            }
        }
        if (status === DataProviderStatus.INVALID_SETTINGS) {
            return (
                <div
                    title={`Invalid settings: ${props.layer
                        .getSettingsContextDelegate()
                        .getInvalidSettings()
                        .join(", ")}`}
                >
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </div>
            );
        }
        if (status === DataProviderStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <CheckCircle className="text-green-700 p-0.5" fontSize="small" />
                </div>
            );
        }
        return null;
    }

    return (
        <>
            {makeStatus()}
            <RemoveItemButton item={props.layer} />
        </>
    );
}
