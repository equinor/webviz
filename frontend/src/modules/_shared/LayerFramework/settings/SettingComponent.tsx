import React from "react";

import { PendingWrapper } from "@lib/components/PendingWrapper";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Link, Warning } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "../../utils/PublishSubscribeDelegate";
import { SettingTopic } from "../delegates/SettingDelegate";
import type { LayerManager } from "../framework/LayerManager/LayerManager";
import { LayerManagerTopic } from "../framework/LayerManager/LayerManager";
import type { Setting, SettingComponentProps as SettingComponentPropsInterface } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    manager: LayerManager;
    sharedSetting: boolean;
};

export function SettingComponent<TValue>(props: SettingComponentProps<TValue>): React.ReactNode {
    const componentRef = React.useRef<(props: SettingComponentPropsInterface<TValue>) => React.ReactNode>(
        props.setting.makeComponent(),
    );
    const value = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALUE_CHANGED);
    const isValid = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALIDITY_CHANGED);
    const isPersisted = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.PERSISTED_STATE_CHANGED,
    );
    const availableValues = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.AVAILABLE_VALUES_CHANGED,
    );
    const overriddenValue = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.OVERRIDDEN_CHANGED);
    const isLoading = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.LOADING_STATE_CHANGED);
    const isInitialized = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.INIT_STATE_CHANGED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, LayerManagerTopic.GLOBAL_SETTINGS_CHANGED);

    let actuallyLoading = isLoading || !isInitialized;
    if (!isLoading && isPersisted && !isValid) {
        actuallyLoading = false;
    }

    function handleValueChanged(newValue: TValue) {
        props.setting.getDelegate().setValue(newValue);
    }

    if (props.sharedSetting && availableValues.length === 0 && isInitialized) {
        return (
            <React.Fragment key={props.setting.getDelegate().getId()}>
                <div className="p-0.5 px-2 w-32">{props.setting.getLabel()}</div>
                <div className="p-0.5 px-2 w-full italic h-8 flex items-center text-orange-600">Empty intersection</div>
            </React.Fragment>
        );
    }

    if (overriddenValue !== undefined) {
        const valueAsString = props.setting
            .getDelegate()
            .valueToString(overriddenValue, props.manager.getWorkbenchSession(), props.manager.getWorkbenchSettings());
        return (
            <React.Fragment key={props.setting.getDelegate().getId()}>
                <div className="p-0.5 px-2 w-32 flex items-center gap-2 text-teal-600">
                    <span>{props.setting.getLabel()}</span>
                    <span className="text-base mb-1">
                        <Link fontSize="inherit" titleAccess="This settings is controlled by a shared setting" />
                    </span>
                </div>
                <div className="p-0.5 px-2 w-full flex items-center h-8">
                    {isValid ? valueAsString : <i className="text-orange-600">No valid shared setting value</i>}
                </div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment key={props.setting.getDelegate().getId()}>
            <div className="p-0.5 px-2 w-32">{props.setting.getLabel()}</div>
            <div className="p-0.5 px-2 w-full">
                <PendingWrapper isPending={actuallyLoading}>
                    <div className="flex flex-col gap-1 min-w-0">
                        <div
                            className={resolveClassNames({
                                "outline outline-red-500 outline-1": !isValid && !actuallyLoading,
                            })}
                        >
                            <componentRef.current
                                onValueChange={handleValueChanged}
                                value={value}
                                isValueValid={isValid}
                                isOverridden={overriddenValue !== undefined}
                                overriddenValue={overriddenValue ?? null}
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
