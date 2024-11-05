import React from "react";

import { PendingWrapper } from "@lib/components/PendingWrapper";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Warning } from "@mui/icons-material";

import { LayerManager, LayerManagerTopic } from "../LayerManager";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { SettingTopic } from "../delegates/SettingDelegate";
import { Setting, SettingComponentProps as SettingComponentPropsInterface } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    manager: LayerManager;
};

export function SettingComponent<TValue>(props: SettingComponentProps<TValue>): React.ReactNode {
    const componentRef = React.useRef<(props: SettingComponentPropsInterface<TValue>) => React.ReactNode>(
        props.setting.makeComponent()
    );
    const value = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALUE_CHANGED);
    const isValid = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALIDITY_CHANGED);
    const isPersisted = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.PERSISTED_STATE_CHANGED
    );
    const availableValues = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.AVAILABLE_VALUES_CHANGED
    );
    const overriddenValue = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.OVERRIDDEN_CHANGED);
    const isLoading = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.LOADING_STATE_CHANGED);
    const isInitialized = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.INIT_STATE_CHANGED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);

    let actuallyLoading = isLoading && !isInitialized;
    if (isPersisted && !isValid && isInitialized) {
        actuallyLoading = false;
    }

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
                <PendingWrapper isPending={actuallyLoading}>
                    <div className="flex flex-col gap-1 min-w-0">
                        <div
                            className={resolveClassNames({
                                "outline outline-red-500 outline-1": !isValid && isInitialized,
                            })}
                        >
                            <componentRef.current
                                onValueChange={handleValueChanged}
                                value={value}
                                isValueValid={isValid}
                                isOverridden={overriddenValue !== undefined}
                                overriddenValue={overriddenValue}
                                availableValues={availableValues}
                                globalSettings={globalSettings}
                                workbenchSession={props.manager.getWorkbenchSession()}
                                workbenchSettings={props.manager.getWorkbenchSettings()}
                            />
                        </div>
                        {isPersisted && !isLoading && isInitialized && (
                            <span
                                className="text-xs flex items-center gap-1 text-orange-600"
                                title="The persisted value for this setting is not valid in the current context. It could also be that the data source has changed."
                            >
                                <Warning fontSize="inherit" />
                                <span className="flex-grow min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                    Persisted value not valid.
                                </span>
                            </span>
                        )}
                    </div>
                </PendingWrapper>
            </div>
        </React.Fragment>
    );
}
