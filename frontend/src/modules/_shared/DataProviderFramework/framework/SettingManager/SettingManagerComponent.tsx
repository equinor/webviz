import React from "react";

import { Link, Warning } from "@mui/icons-material";

import { StatusWrapper } from "@lib/newComponents/StatusWrapper";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SettingComponentProps as SettingComponentPropsInterface } from "../../interfacesAndTypes/customSettingImplementation";
import { isEnabledObject, isSettingEnabled } from "../../interfacesAndTypes/customSettingsHandler";
import type { Setting, SettingTypeDefinitions } from "../../settings/settingsDefinitions";
import { type DataProviderManager, DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";

import { ExternalControllerProviderType, SettingTopic } from "./SettingManager";
import type { SettingManager } from "./SettingManager";

export type SettingComponentProps<TSetting extends Setting> = {
    setting: SettingManager<TSetting>;
    manager: DataProviderManager;
    sharedSetting: boolean;
};

export function SettingManagerComponent<
    TSetting extends Setting,
    TValue extends SettingTypeDefinitions[TSetting]["internalValue"] =
        SettingTypeDefinitions[TSetting]["internalValue"],
>(props: SettingComponentProps<TSetting>): React.ReactNode {
    const componentRef = React.useRef<(props: SettingComponentPropsInterface<any, any>) => React.ReactNode>(
        props.setting.makeComponent(),
    );
    const value = usePublishSubscribeTopicValue(props.setting, SettingTopic.INTERNAL_VALUE);
    const attributes = usePublishSubscribeTopicValue(props.setting, SettingTopic.ATTRIBUTES);
    const isValid = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_VALID);
    const isPersisted = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_PERSISTED);
    const isValidPersistedValue = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_PERSISTED_VALUE_VALID);
    const valueConstraints = usePublishSubscribeTopicValue(props.setting, SettingTopic.VALUE_CONSTRAINTS);
    const isExternallyControlled = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_EXTERNALLY_CONTROLLED);
    const externalControllerProvider = usePublishSubscribeTopicValue(
        props.setting,
        SettingTopic.EXTERNAL_CONTROLLER_PROVIDER,
    );
    const isLoading = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_LOADING);
    const isInitialized = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_INITIALIZED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, DataProviderManagerTopic.GLOBAL_SETTINGS);

    let actuallyLoading = isLoading || !isInitialized;
    if (!isLoading && isPersisted && !isValid) {
        actuallyLoading = false;
    }

    const handleValueChanged = React.useCallback(
        function handleValueChanged(newValue: TValue | null | ((prevValue: TValue | null) => TValue | null)) {
            if (typeof newValue === "function") {
                const updaterFunction = newValue;
                const currentValue = props.setting.getValue() as TValue | null;
                newValue = updaterFunction(currentValue);
            }
            props.setting.setValue(newValue);
        },
        [props.setting],
    );

    if (!attributes.visible) {
        return null;
    }

    if (props.sharedSetting && !actuallyLoading && valueConstraints === null && !props.setting.isStatic()) {
        return (
            <React.Fragment key={props.setting.getId()}>
                <div className="py-4xs px-2xs flex w-32 items-center">{props.setting.getLabel()}</div>
                <div className="text-warning-strong px-4xs py-4xs gap-x-2xs flex w-full items-center italic">
                    Empty intersection
                </div>
            </React.Fragment>
        );
    }

    if (isExternallyControlled) {
        if (externalControllerProvider !== ExternalControllerProviderType.SHARED_SETTING) {
            return null;
        }
        const valueAsString = props.setting.valueToRepresentation(
            value,
            props.manager.getWorkbenchSession(),
            props.manager.getWorkbenchSettings(),
        );

        return (
            <React.Fragment key={props.setting.getId()}>
                <div className="gap-x-2xs py-4xs px-2xs text-accent-subtle flex w-32 items-center">
                    <span>{props.setting.getLabel()}</span>
                    <span className="mb-2xs text-base">
                        <Link style={{ fontSize: 16 }} titleAccess="This settings is controlled by a shared setting" />
                    </span>
                </div>
                <div className="gap-x-2xs py-4xs px-2xs flex w-full items-center">
                    {isValid ? valueAsString : <i className="text-warning-subtle">No valid shared setting value</i>}
                </div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment key={props.setting.getId()}>
            <div className="px-2xs py-4xs flex w-32 items-center">{props.setting.getLabel()}</div>
            <div className="px-2xs py-4xs w-full">
                <StatusWrapper isPending={actuallyLoading}>
                    <div className="gap-y-3xs flex min-w-0 flex-col">
                        <div
                            className={resolveClassNames("relative", {
                                "outline-danger-strong outline": !isValid && !actuallyLoading,
                                "pointer-events-none opacity-50": !isSettingEnabled(attributes.enabled),
                            })}
                        >
                            {isEnabledObject(attributes.enabled) && !attributes.enabled.enabled && (
                                <div className="z-overlay bg-surface/80 px-2xs py-2xs absolute inset-0 flex flex-col items-center justify-center text-center">
                                    {attributes.enabled.reason}
                                </div>
                            )}
                            <componentRef.current
                                onValueChange={handleValueChanged}
                                value={value}
                                isValueValid={isValid}
                                isOverridden={isExternallyControlled}
                                overriddenValue={value}
                                valueConstraints={valueConstraints}
                                globalSettings={globalSettings}
                                workbenchSession={props.manager.getWorkbenchSession()}
                                workbenchSettings={props.manager.getWorkbenchSettings()}
                            />
                        </div>
                        {isPersisted && isValidPersistedValue && !isLoading && isInitialized && !isValid && (
                            <span
                                className="gap-x-3xs text-body-xs text-warning-subtle flex items-center"
                                title="The persisted value for this setting is not valid in the current context. It could also be that the data source has changed."
                            >
                                <Warning fontSize="inherit" />
                                <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                    Persisted value not valid.
                                </span>
                            </span>
                        )}
                        {isPersisted && !isValidPersistedValue && (
                            <span
                                className="gap-x-3xs text-body-xs text-danger-strong flex items-center"
                                title="The persisted value for this setting has an invalid structure and could not be loaded."
                            >
                                <Warning fontSize="inherit" />
                                <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                    Persisted value has invalid structure.
                                </span>
                            </span>
                        )}
                    </div>
                </StatusWrapper>
            </div>
        </React.Fragment>
    );
}
