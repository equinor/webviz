import type React from "react";

import { Delete, FileOpen } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { getSessionMetadataOptions } from "@api";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SessionRowProps = {
    session: PrivateWorkbenchSession;
    onOpen: (sessionId: string | null) => void;
    onDiscard: (sessionId: string | null) => void;
};

export function SessionRow(props: SessionRowProps): React.ReactNode {
    const backendSession = useQuery({
        ...getSessionMetadataOptions({
            path: { session_id: props.session.getId() ?? "" },
        }),
        enabled: Boolean(props.session.getId()) && props.session.getIsPersisted(),
        gcTime: 0,
        staleTime: 0,
    });

    let lastPersisted: React.ReactNode = "Never";
    if (props.session.getId()) {
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
            <td className={resolveClassNames("p-2 border-r border-b font-bold", { italic: !props.session.getId() })}>
                {props.session.getMetadata().title}
            </td>
            <td className="p-2 border-r border-b">
                {new Date(props.session.getMetadata().createdAt).toLocaleString()}
            </td>
            <td className="p-2 border-r border-b font-bold">
                {new Date(props.session.getMetadata().lastModifiedMs).toLocaleString()}
            </td>
            <td className="p-2 border-r border-b">{lastPersisted}</td>
            <td className="p-2 flex gap-1 border-b">
                <Button variant="text" onClick={() => props.onOpen(props.session.getId())} size="small">
                    <FileOpen fontSize="inherit" />
                    Open
                </Button>
                <Button
                    variant="text"
                    onClick={() => props.onDiscard(props.session.getId())}
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
