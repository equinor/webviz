import React from "react";

import { isEqual } from "lodash-es";

import type { SettingsStatusWriter } from "@framework/StatusWriter";

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
