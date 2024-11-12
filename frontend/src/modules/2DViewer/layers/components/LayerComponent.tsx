import React from "react";

import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Block, CheckCircle, Difference, Error, ExpandLess, ExpandMore } from "@mui/icons-material";

import { EditName } from "./EditName";
import { RemoveButton } from "./RemoveButton";
import { SettingComponent } from "./SettingComponent";
import { VisibilityToggle } from "./VisibilityToggle";

import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { LayerDelegateTopic, LayerStatus } from "../delegates/LayerDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { SettingsContextDelegateTopic, SettingsContextLoadingState } from "../delegates/SettingsContextDelegate";
import { Layer, Setting } from "../interfaces";

export type LayerComponentProps = {
    layer: Layer<any, any>;
};

export function LayerComponent(props: LayerComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.layer.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function makeSetting(setting: Setting<any>) {
        const manager = props.layer.getItemDelegate().getLayerManager();
        if (!manager) {
            return null;
        }
        return (
            <SettingComponent
                key={setting.getDelegate().getId()}
                setting={setting}
                manager={manager}
                sharedSetting={false}
            />
        );
    }

    function makeSettings(settings: Record<string, Setting<any>>): React.ReactNode[] {
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
                {makeSettings(props.layer.getLayerDelegate().getSettingsContext().getDelegate().getSettings())}
            </div>
        </SortableListItem>
    );
}

type StartActionProps = {
    layer: Layer<any, any>;
};

function StartActions(props: StartActionProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.layer.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    function handleToggleExpanded() {
        props.layer.getItemDelegate().setIsExpanded(!isExpanded);
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
    layer: Layer<any, any>;
};

function EndActions(props: EndActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.layer.getLayerDelegate(), LayerDelegateTopic.STATUS);
    const settingsStatus = usePublishSubscribeTopicValue(
        props.layer.getLayerDelegate().getSettingsContext().getDelegate(),
        SettingsContextDelegateTopic.LOADING_STATE_CHANGED
    );
    const isSubordinated = usePublishSubscribeTopicValue(
        props.layer.getLayerDelegate(),
        LayerDelegateTopic.SUBORDINATED
    );

    function makeStatus(): React.ReactNode {
        if (isSubordinated) {
            return (
                <div title="Subordinated">
                    <Difference fontSize="small" />
                </div>
            );
        }
        if (status === LayerStatus.LOADING) {
            return (
                <div title="Loading">
                    <CircularProgress size="extra-small" />
                </div>
            );
        }
        if (status === LayerStatus.ERROR) {
            const error = props.layer.getLayerDelegate().getError();
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
        if (status === LayerStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <CheckCircle className="text-green-700 p-0.5" fontSize="small" />
                </div>
            );
        }
        if (settingsStatus === SettingsContextLoadingState.FAILED) {
            return (
                <div
                    title={`Invalid settings: ${props.layer
                        .getLayerDelegate()
                        .getSettingsContext()
                        .getDelegate()
                        .getInvalidSettings()
                        .join(", ")}`}
                >
                    <Block className="text-red-700 p-0.5" fontSize="small" />
                </div>
            );
        }
        return null;
    }

    return (
        <>
            {makeStatus()}
            <RemoveButton item={props.layer} />
        </>
    );
}
