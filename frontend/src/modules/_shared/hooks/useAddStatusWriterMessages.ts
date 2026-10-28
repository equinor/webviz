import React from "react";

import { isEqual } from "lodash-es";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import type { SettingAnnotation } from "@lib/components/Setting";

type StatusWriterMethod = "addActionRequired" | "addError" | "addWarning";

function useAddMessagesToStatusWriter(
    statusWriter: SettingsStatusWriter,
    method: StatusWriterMethod,
): (messages: string[]) => void {
    const [messages, setMessages] = React.useState<string[]>([]);

    for (const message of messages) {
        statusWriter[method](message);
    }

    return React.useCallback(function addMessages(newMessages: string[]) {
        setMessages((prev) => (isEqual(prev, newMessages) ? prev : newMessages));
    }, []);
}

/**
 * Returns a stable callback that writes the given list of messages to `statusWriter` as
 * `ActionRequired`.
 */
export function useAddActionRequiredToStatusWriter(statusWriter: SettingsStatusWriter): (messages: string[]) => void {
    return useAddMessagesToStatusWriter(statusWriter, "addActionRequired");
}

/**
 * Returns a stable callback that writes the given list of messages to `statusWriter` as `Error`.
 */
export function useAddErrorToStatusWriter(statusWriter: SettingsStatusWriter): (messages: string[]) => void {
    return useAddMessagesToStatusWriter(statusWriter, "addError");
}

/**
 * Returns a stable callback that writes the given list of messages to `statusWriter` as `Warning`.
 */
export function useAddWarningToStatusWriter(statusWriter: SettingsStatusWriter): (messages: string[]) => void {
    return useAddMessagesToStatusWriter(statusWriter, "addWarning");
}

/**
 * Returns a stable callback taking a list of setting annotations (e.g. from `Setting.Panel`'s
 * `onAnnotationsChange`). Annotations of type "error" are written to `statusWriter` as `ActionRequired`;
 * other annotation types are ignored.
 */
export function useAddErrorAnnotationsAsActionRequiredToStatusWriter(
    statusWriter: SettingsStatusWriter,
): (annotations: SettingAnnotation[]) => void {
    const addActionRequiredToStatusWriter = useAddActionRequiredToStatusWriter(statusWriter);

    return React.useCallback(
        function handlePanelAnnotationsChange(annotations: SettingAnnotation[]) {
            const errorAnnotationMessages = annotations
                .filter((annotation) => annotation.type === "error")
                .map((annotation) => annotation.message);
            addActionRequiredToStatusWriter(errorAnnotationMessages);
        },
        [addActionRequiredToStatusWriter],
    );
}
