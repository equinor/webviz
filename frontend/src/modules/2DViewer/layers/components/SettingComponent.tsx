import React from "react";

import { PendingWrapper } from "@lib/components/PendingWrapper";

import { LayerManager, LayerManagerTopic } from "../LayerManager";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { Setting, SettingComponentProps as SettingComponentPropsInterface, SettingTopic } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    manager: LayerManager;
};

export function SettingComponent<TValue>(props: SettingComponentProps<TValue>): React.ReactNode {
    const componentRef = React.useRef<(props: SettingComponentPropsInterface<TValue>) => React.ReactNode>(
        props.setting.makeComponent()
    );
    const value = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALUE_CHANGED);
    const availableValues = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.AVAILABLE_VALUES_CHANGED
    );
    const overriddenValue = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.OVERRIDDEN_CHANGED);
    const isLoading = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.LOADING_STATE_CHANGED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);

    function handleValueChanged(newValue: TValue) {
        props.setting.getDelegate().setValue(newValue);
    }

    if (overriddenValue !== undefined) {
        return null;
    }

    return (
        <React.Fragment key={props.setting.getDelegate().getId()}>
            <div className="p-0.5 px-2 w-32">{props.setting.getLabel()}</div>
            <div className="p-0.5 px-2 w-full">
                <PendingWrapper isPending={isLoading}>
                    <componentRef.current
                        onValueChange={handleValueChanged}
                        value={value}
                        isOverridden={overriddenValue !== undefined}
                        overriddenValue={overriddenValue}
                        availableValues={availableValues}
                        globalSettings={globalSettings}
                        workbenchSession={props.manager.getWorkbenchSession()}
                        workbenchSettings={props.manager.getWorkbenchSettings()}
                    />
                </PendingWrapper>
            </div>
        </React.Fragment>
    );
}
