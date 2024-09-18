import React from "react";

import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { SortableListItem } from "@lib/components/SortableList";
import { Check, Error } from "@mui/icons-material";

import { EditName } from "./EditName";
import { RemoveButton } from "./RemoveButton";
import { SettingComponent } from "./SettingComponent";
import { VisibilityToggle } from "./VisibilityToggle";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { LayerDelegateTopic } from "../delegates/LayerDelegate";
import { Layer, LayerStatus, Setting } from "../interfaces";

export type LayerComponentProps = {
    layer: Layer<any, any>;
};

export function LayerComponent(props: LayerComponentProps): React.ReactNode {
    function makeSetting(setting: Setting<any>) {
        const manager = props.layer.getItemDelegate().getLayerManager();
        if (!manager) {
            return null;
        }
        return (
            <SettingComponent
                key={setting.getDelegate().getId()}
                setting={setting}
                workbenchSession={manager.getWorkbenchSession()}
                workbenchSettings={manager.getWorkbenchSettings()}
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
            startAdornment={<VisibilityToggle item={props.layer} />}
            endAdornment={<Actions layer={props.layer} />}
        >
            <div className="table border">
                {makeSettings(props.layer.getLayerDelegate().getSettingsContext().getDelegate().getSettings())}
            </div>
        </SortableListItem>
    );
}

type ActionProps = {
    layer: Layer<any, any>;
};

function Actions(props: ActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.layer.getLayerDelegate(), LayerDelegateTopic.STATUS);

    function makeStatus(): React.ReactNode {
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
                    <div title={error} className="rounded-full bg-red-700 text-white p-0.5">
                        <Error fontSize="inherit" />
                    </div>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <div title={statusMessage.message}>
                        <Error fontSize="inherit" className="rounded-full bg-red-700 text-white p-0.5" />
                    </div>
                );
            }
        }
        if (status === LayerStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <Check fontSize="inherit" className="rounded-full bg-green-700 text-white p-0.5" />
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
