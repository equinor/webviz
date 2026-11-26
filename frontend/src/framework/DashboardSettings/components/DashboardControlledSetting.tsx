import React from "react";

import type { SettingAnnotation } from "@lib/components/Setting";
import { useSettingReportFieldAnnotations, useSettingReportFieldStatus } from "@lib/components/Setting";

import type { DashboardSettingDefinition } from "../DashboardSettingDefinition";

import { DashboardSettingIndicator } from "./DashboardSettingIndicator";

export type DashboardControlledSettingProps<TValue> = {
    // The label of the setting
    label: string;
    // The dashboard value
    value: TValue;
    // Whether the dashboard value is valid in the context of the setting it controls
    isValueValidHere: boolean;
    // Whether the setting is currently controlled by the dashboard setting
    isControlled: boolean;
    // The dashboard setting controlling the value - provides the default representation of it
    controlledBy: DashboardSettingDefinition<TValue, any>;
    // Opt-out of the dashboard setting's value representation
    valueRepresentation?: (value: TValue) => React.ReactNode;
    // Render prop receiving the label (with the dashboard setting indicator while controlled) and a function wrapping
    // the setting's regular editor - which is replaced by the dashboard value while the setting is controlled
    children: (label: React.ReactNode, wrapSetting: (editor: React.ReactNode) => React.ReactNode) => React.ReactNode;
};

/**
 * Handles a setting that can be controlled by a dashboard setting: provides the label with the dashboard setting
 * indicator, and wraps the regular editor so the dashboard value is shown as text (or a message when it is not
 * valid here) while controlled.
 */
export function DashboardControlledSetting<TValue>(props: DashboardControlledSettingProps<TValue>): React.ReactNode {
    const isInvalidDashboardValue = props.isControlled && !props.isValueValidHere;

    const annotations = React.useMemo<SettingAnnotation[] | null>(
        () =>
            isInvalidDashboardValue
                ? [{ type: "error", message: `Dashboard setting value for "${props.label}" is not valid here` }]
                : null,
        [isInvalidDashboardValue, props.label],
    );
    const fieldStatus = isInvalidDashboardValue
        ? { hasInvalidValue: true, hasError: false, hasWarning: false, hasInfo: false }
        : null;

    // Reported on behalf of the field the children render - the invalid value gets the Block icon in its section
    useSettingReportFieldAnnotations(annotations);
    useSettingReportFieldStatus(fieldStatus);

    const label = props.isControlled ? (
        <span className="gap-x-2xs flex items-center">
            {props.label}
            <DashboardSettingIndicator
                dashboardSettingLabel={props.controlledBy.label}
                isValueValidHere={props.isValueValidHere}
            />
        </span>
    ) : (
        props.label
    );

    function wrapSetting(editor: React.ReactNode): React.ReactNode {
        if (!props.isControlled) {
            return editor;
        }

        if (!props.isValueValidHere) {
            return <i className="text-warning-subtle text-body-sm">Dashboard value not valid here</i>;
        }

        return (
            <span className="text-body-sm">
                {props.valueRepresentation
                    ? props.valueRepresentation(props.value)
                    : props.controlledBy.valueRepresentation(props.value)}
            </span>
        );
    }

    return props.children(label, wrapSetting);
}
