import React from "react";

import { Error, HourglassEmpty, Link } from "@mui/icons-material";

import { DashboardSettingIndicator } from "@framework/DashboardSettings/components/DashboardSettingIndicator";
import { Field } from "@lib/components/Field";
import { StatusWrapper } from "@lib/components/StatusWrapper";
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
    const areAttributesResolved = usePublishSubscribeTopicValue(props.setting, SettingTopic.ARE_ATTRIBUTES_RESOLVED);
    const isValid = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_VALID);
    const isPersisted = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_PERSISTED);
    const isValidPersistedValue = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_PERSISTED_VALUE_VALID);
    const valueConstraints = usePublishSubscribeTopicValue(props.setting, SettingTopic.VALUE_CONSTRAINTS);
    const isExternallyControlled = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_EXTERNALLY_CONTROLLED);
    const isDashboardControlled = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_DASHBOARD_CONTROLLED);
    const externalControllerProvider = usePublishSubscribeTopicValue(
        props.setting,
        SettingTopic.EXTERNAL_CONTROLLER_PROVIDER,
    );
    const isLoading = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_LOADING);
    const isBlocked = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_BLOCKED);
    const blockedBy = usePublishSubscribeTopicValue(props.setting, SettingTopic.BLOCKED_BY);
    const isInitialized = usePublishSubscribeTopicValue(props.setting, SettingTopic.IS_INITIALIZED);
    const globalSettings = usePublishSubscribeTopicValue(props.manager, DataProviderManagerTopic.GLOBAL_SETTINGS);

    // A blocked setting waits for another one to become valid - which is up to the user, so it is not shown as loading
    let actuallyLoading = !isBlocked && (isLoading || !isInitialized);
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

    // Until its attributes are resolved, a setting that is about to be hidden would flash up
    if (!attributes.visible || !areAttributesResolved) {
        return null;
    }

    if (
        props.sharedSetting &&
        !actuallyLoading &&
        !isBlocked &&
        valueConstraints === null &&
        !props.setting.isStatic()
    ) {
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
                    <span className="mb-2xs text-body-base">
                        <Link style={{ fontSize: 16 }} titleAccess="This settings is controlled by a shared setting" />
                    </span>
                </div>
                <div className="gap-x-2xs py-4xs px-2xs flex w-full items-center">
                    {isBlocked ? (
                        <i className="text-neutral-subtle">{makeBlockedMessage(blockedBy)}</i>
                    ) : isValid ? (
                        valueAsString
                    ) : (
                        <i className="text-warning-subtle">No valid shared setting value</i>
                    )}
                </div>
            </React.Fragment>
        );
    }

    const dashboardSettingIndicator = isDashboardControlled ? (
        <DashboardSettingIndicator
            dashboardSettingLabel={props.setting.getDashboardSettingLabel() ?? ""}
            isValueValidHere={isValid || actuallyLoading}
        />
    ) : null;

    if (isDashboardControlled && !props.setting.keepsComponentEditableWhileDashboardControlled()) {
        return (
            <React.Fragment key={props.setting.getId()}>
                <div className="gap-x-2xs px-2xs py-4xs text-body-sm flex w-32 items-center">
                    <span>{props.setting.getLabel()}</span>
                    {dashboardSettingIndicator}
                </div>
                <div className="gap-x-2xs py-4xs px-2xs flex w-full items-center">
                    <StatusWrapper isPending={actuallyLoading}>
                        {isValid || actuallyLoading ? (
                            props.setting.valueToRepresentation(
                                value,
                                props.manager.getWorkbenchSession(),
                                props.manager.getWorkbenchSettings(),
                            )
                        ) : (
                            <i className="text-warning-subtle">Dashboard value not available here</i>
                        )}
                    </StatusWrapper>
                </div>
            </React.Fragment>
        );
    }

    // A blocked setting is not judged invalid, as its value constraints may be outdated - for the same reason, it can't
    // be changed until it is no longer blocked
    const isShownAsInvalid = !isValid && !actuallyLoading && !isBlocked;
    const isDisabled = !isSettingEnabled(attributes.enabled) || isBlocked;

    return (
        <React.Fragment key={props.setting.getId()}>
            <div className="gap-x-2xs px-2xs py-4xs text-body-sm flex w-32 items-center">
                <span>{props.setting.getLabel()}</span>
                {dashboardSettingIndicator}
            </div>
            <div className="px-2xs py-4xs w-full min-w-0">
                <StatusWrapper isPending={actuallyLoading}>
                    <div className="gap-y-3xs flex min-w-0 flex-col">
                        <Field.Root inline invalid={isShownAsInvalid}>
                            <div
                                className={resolveClassNames("relative", {
                                    "outline-danger-strong outline": isShownAsInvalid,
                                    "pointer-events-none opacity-50": isDisabled,
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
                                    valueConstraints={valueConstraints}
                                    globalSettings={globalSettings}
                                    disabled={isDisabled}
                                    workbenchSession={props.manager.getWorkbenchSession()}
                                    workbenchSettings={props.manager.getWorkbenchSettings()}
                                />
                            </div>
                        </Field.Root>
                        {isPersisted &&
                            isValidPersistedValue &&
                            !isLoading &&
                            isInitialized &&
                            !isValid &&
                            !isBlocked && (
                                <span
                                    className="gap-x-3xs text-body-xs text-warning-subtle flex items-center"
                                    title="The saved value for this setting is not valid in the current context. It could also be that the data source has changed."
                                >
                                    <Error fontSize="inherit" />
                                    <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                        Saved value not valid.
                                    </span>
                                </span>
                            )}
                        {isPersisted && !isValidPersistedValue && (
                            <span
                                className="gap-x-3xs text-body-xs text-danger-strong flex items-center"
                                title="The saved value for this setting has an invalid structure and could not be loaded."
                            >
                                <Error fontSize="inherit" />
                                <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                    Saved value has invalid structure.
                                </span>
                            </span>
                        )}
                        {!isPersisted && isShownAsInvalid && (
                            <span
                                className="gap-x-3xs text-body-xs text-danger-strong flex items-center"
                                title="This setting's value is invalid, likely because a dependency changed. Please choose a valid value."
                            >
                                <Error fontSize="inherit" />
                                <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                    The current value is invalid.
                                </span>
                            </span>
                        )}
                        {isBlocked && (
                            <span
                                className="gap-x-3xs text-body-xs text-neutral-subtle flex items-center"
                                title="The options of this setting depend on the settings named here. It keeps its value, and can be changed once they are valid."
                            >
                                <HourglassEmpty fontSize="inherit" />
                                <span className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap">
                                    {makeBlockedMessage(blockedBy)}
                                </span>
                            </span>
                        )}
                    </div>
                </StatusWrapper>
            </div>
        </React.Fragment>
    );
}

function makeBlockedMessage(blockedBy: string[]): string {
    if (blockedBy.length === 0) {
        return "Waiting for other settings to become valid.";
    }
    if (blockedBy.length === 1) {
        return `Waiting for a valid ${blockedBy[0]}.`;
    }
    return `Waiting for valid ${blockedBy.join(", ")}.`;
}
