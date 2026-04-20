import React from "react";

import { useAtomValue, useSetAtom } from "jotai";

import { viewLinksAtom } from "../atoms/baseAtoms";
import type { ViewLink } from "../components/ViewLinkManager";

/**
 * Manages the lifecycle of persisted view links:
 * - Reads from the atom once intersectionViewIds become available.
 * - Returns null until then (signaling "not ready").
 * - Provides a stable callback that writes ViewLink[] to the atom.
 */
export function usePersistedViewLinks(intersectionViewIds: string[]): {
    initialViewLinks: ViewLink[] | null;
    handleViewLinksChange: (viewLinks: ViewLink[]) => void;
} {
    const persistedViewLinks = useAtomValue(viewLinksAtom);
    const setPersistedViewLinks = useSetAtom(viewLinksAtom);

    const initialViewLinksRef = React.useRef<ViewLink[] | null>(null);
    const hasComputedInitialRef = React.useRef(false);

    // Return persisted view links once views are available.
    // Before that, we can't validate which links are still valid.
    if (!hasComputedInitialRef.current && intersectionViewIds.length > 0) {
        hasComputedInitialRef.current = true;
        if (persistedViewLinks) {
            const validIdSet = new Set(intersectionViewIds);
            initialViewLinksRef.current = persistedViewLinks
                .map((link) => ({
                    ...link,
                    viewIds: link.viewIds.filter((id) => validIdSet.has(id)),
                }))
                .filter((link) => link.viewIds.length > 1);
        } else {
            initialViewLinksRef.current = [];
        }
    }

    const handleViewLinksChange = React.useCallback(
        (viewLinks: ViewLink[]) => {
            setPersistedViewLinks(viewLinks);
        },
        [setPersistedViewLinks],
    );

    return { initialViewLinks: initialViewLinksRef.current, handleViewLinksChange };
}
