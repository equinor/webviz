import type React from "react";

import { Error, Info, Warning } from "@mui/icons-material";

import type { StatusMessage } from "@framework/types/statusWriter";
import { StatusMessageType } from "@framework/types/statusWriter";
import { Tooltip } from "@lib/components/Tooltip";

export type StatusMessagesProps = { statusMessages: readonly StatusMessage[] };

export function StatusMessages(props: StatusMessagesProps) {
    const categorizedMessages = {
        warning: props.statusMessages.filter((m) => m.type === StatusMessageType.Warning),
        error: props.statusMessages.filter((m) => m.type === StatusMessageType.Error),
        info: props.statusMessages.filter((m) => m.type === StatusMessageType.Info),
    };

    return (
        <>
            <StatusMessage messages={categorizedMessages.info}>
                <Info className="text-info-subtle" style={{ fontSize: 16 }} />
            </StatusMessage>

            <StatusMessage messages={categorizedMessages.warning}>
                <Warning className="text-warning-subtle" style={{ fontSize: 16 }} />
            </StatusMessage>

            <StatusMessage messages={categorizedMessages.error}>
                <Error className="text-danger-subtle" style={{ fontSize: 16 }} />
            </StatusMessage>
        </>
    );
}

function StatusMessage(props: { messages: StatusMessage[]; children: React.ReactElement }) {
    if (!props.messages.length) return null;

    return (
        <Tooltip
            title={
                <ul>
                    {props.messages.map((m, i) => (
                        <li key={i}>{m.message}</li>
                    ))}
                </ul>
            }
        >
            {props.children}
        </Tooltip>
    );
}
