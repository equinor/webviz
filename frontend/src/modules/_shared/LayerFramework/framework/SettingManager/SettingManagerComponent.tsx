import React from "react";

import { PendingWrapper } from "@lib/components/PendingWrapper";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Link, Warning } from "@mui/icons-material";

import type { SettingManager } from "./SettingManager";
import { OverriddenValueProviderType, SettingTopic } from "./SettingManager";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import type { SettingComponentProps as SettingComponentPropsInterface } from "../../interfacesAndTypes/customSettingImplementation";
import type { Setting, SettingCategories, SettingTypes } from "../../settings/settingsDefinitions";
import type { DataLayerManager } from "../DataLayerManager/DataLayerManager";
import { LayerManagerTopic } from "../DataLayerManager/DataLayerManager";

export type SettingComponentProps<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting],
    TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting]
> = {
    setting: SettingManager<TSetting, TValue, TCategory>;
    manager: DataLayerManager;
    sharedSetting: boolean;
};

export function SettingComponent<
    TSetting extends Setting,
    TValue extends SettingTypes[TSetting] = SettingTypes[TSetting],
    TCategory extends SettingCategories[TSetting] = SettingCategories[TSetting]
>(props: SettingComponentProps<TSetting, TValue, TCategory>): React.ReactNode {
    const componentRef = React.useRef<(props: SettingComponentPropsInterface<TValue, TCategory>) => React.ReactNode>(
        props.setting.makeComponent()
    );
    const value = usePublishSubscribeTopicValue(props.setting, SettingTopic.VALUE);
    const isValid = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_VALID);
    const isPersisted = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_PERSISTED);
    const availableValues = usePublishSubscribeTopicValue(props.setting, SettingTopic.AVAILABLE_VALUES);
    const overriddenValue = usePublishSubscribeTopicValue(props.setting, SettingTopic.OVERRIDDEN_VALUE);
    const overriddenValueProvider = usePublishSubscribeTopicValue(
        props.setting,
        SettingTopic.OVERRIDDEN_VALUE_PROVIDER
    );
    const isLoading = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_LOADING);
    const isInitialized = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_INITIALIZED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, LayerManagerTopic.GLOBAL_SETTINGS);

    let actuallyLoading = isLoading || !isInitialized;
    if (!isLoading && isPersisted && !isValid) {
        actuallyLoading = false;
    }

    function handleValueChanged(newValue: TValue) {
        props.setting.setValue(newValue);
    }

    if (props.sharedSetting && isInitialized && availableValues === null) {
        return (
            <React.Fragment key={props.setting.getId()}>
                <div className="p-0.5 px-2 w-32">{props.setting.getLabel()}</div>
                <div className="p-0.5 px-2 w-full italic h-8 flex items-center text-orange-600">Empty intersection</div>
            </React.Fragment>
        );
    }

    if (overriddenValue !== undefined) {
        if (overriddenValueProvider !== OverriddenValueProviderType.SHARED_SETTING) {
            return null;
        }
        const valueAsString = props.setting.valueToRepresentation(
            overriddenValue,
            props.manager.getWorkbenchSession(),
            props.manager.getWorkbenchSettings()
        );

        return (
            <React.Fragment key={props.setting.getId()}>
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
        <React.Fragment key={props.setting.getId()}>
            <div className="p-0.5 px-2 w-32">{props.setting.getLabel()}</div>
            <div className="p-0.5 px-2 w-full">
                <PendingWrapper isPending={actuallyLoading}>
                    <div className="flex flex-col gap-1 min-w-0">
                        <div
                            className={resolveClassNames({
                                "outline outline-red-500": !isValid && !actuallyLoading,
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
                        {isPersisted && !isLoading && isInitialized && !isValid && (
                            <span
                                className="text-xs flex items-center gap-1 text-orange-600"
                                title="The persisted value for this setting is not valid in the current context. It could also be that the data source has changed."
                            >
                                <Warning fontSize="inherit" />
                                <span className="grow min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
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
