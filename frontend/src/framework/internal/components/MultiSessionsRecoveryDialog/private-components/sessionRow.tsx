import type React from "react";

import { Delete, FileOpen } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getSessionMetadataOptions } from "@api";
import {
    isPersisted,
    type WorkbenchSessionDataContainer,
} from "@framework/internal/WorkbenchSession/WorkbenchSessionDataContainer";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SessionRowProps = {
    session: WorkbenchSessionDataContainer;
    onOpen: (sessionId: string | null) => void;
    onDiscard: (sessionId: string | null) => void;
};

export function SessionRow(props: SessionRowProps): React.ReactNode {
    const backendSession = useQuery({
        ...getSessionMetadataOptions({
            path: { session_id: props.session.id ?? "" },
        }),
        enabled: Boolean(props.session.id) && isPersisted(props.session),
        gcTime: 0,
        staleTime: 0,
    });

    let lastPersisted: React.ReactNode = "Never";
    if (props.session.id) {
        if (backendSession.isSuccess) {
            const updatedAt = backendSession.data.updatedAt;
            if (updatedAt) {
                lastPersisted = new Date(updatedAt).toLocaleString();
            }
        } else if (backendSession.isError) {
            lastPersisted = "Failed to fetch metadata";
        } else if (backendSession.isFetching) {
            lastPersisted = (
                <span className="flex items-center gap-2 italic">
                    <CircularProgress size="extra-small" />
                    Fetching from server...
                </span>
            );
        }
    }

    return (
        <tr className="hover:bg-blue-50">
            <td className={resolveClassNames("p-2 border-r border-b font-bold", { italic: !props.session.id })}>
                {props.session.metadata.title}
            </td>
            <td className="p-2 border-r border-b">{new Date(props.session.metadata.createdAt).toLocaleString()}</td>
            <td className="p-2 border-r border-b font-bold">
                {new Date(props.session.metadata.lastModifiedMs).toLocaleString()}
            </td>
            <td className="p-2 border-r border-b">{lastPersisted}</td>
            <td className="p-2 flex gap-1 border-b">
                <Button variant="text" onClick={() => props.onOpen(props.session.id ?? null)} size="small">
                    <FileOpen fontSize="inherit" />
                    Open
                </Button>
                <Button
                    variant="text"
                    onClick={() => props.onDiscard(props.session.id ?? null)}
                    size="small"
                    color="danger"
                >
                    <Delete fontSize="inherit" />
                    Discard
                </Button>
            </td>
        </tr>
    );
}
