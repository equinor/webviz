import React from "react";

import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { Setting, SettingComponentProps as SettingComponentPropsInterface, SettingTopic } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
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

    function handleValueChanged(newValue: TValue) {
        props.setting.getDelegate().setValue(newValue);
    }

    return (
        <div key={props.setting.getDelegate().getId()} className={resolveClassNames("table-row", { hidden: false })}>
            <div className="table-cell align-middle p-1 text-xs">{props.setting.getLabel()}</div>
            <div className="table-cell align-middle p-1 text-sm w-full">
                <PendingWrapper isPending={isLoading}>
                    <componentRef.current
                        onValueChange={handleValueChanged}
                        value={value}
                        isOverridden={overriddenValue !== undefined}
                        overriddenValue={overriddenValue}
                        availableValues={availableValues}
                        workbenchSession={props.workbenchSession}
                        workbenchSettings={props.workbenchSettings}
                    />
                </PendingWrapper>
            </div>
        </div>
    );
}
