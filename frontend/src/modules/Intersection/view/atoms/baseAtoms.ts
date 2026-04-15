import { atom } from "jotai";

import type { Bounds } from "@modules/_shared/components/EsvIntersection";

import type { IntersectionViewInfo, ViewLink } from "../components/ViewLinkManager";

export type PersistedViewLink = {
    id: string;
    color: string;
    viewIds: string[];
    viewport: number[] | null;
    viewportSourceViewId: string | null;
    verticalScale: number;
    bounds: Bounds | null;
};

export const viewLinksAtom = atom<PersistedViewLink[]>([]);

export function toViewLinks(persisted: PersistedViewLink[], intersectionViews: IntersectionViewInfo[]): ViewLink[] {
    const viewLinks: ViewLink[] = [];
    for (const pl of persisted) {
        const views = pl.viewIds
            .map((id) => intersectionViews.find((iv) => iv.id === id))
            .filter((v): v is IntersectionViewInfo => v !== undefined);
        if (views.length < 2) continue;
        viewLinks.push({
            id: pl.id,
            color: pl.color,
            views,
            viewport: pl.viewport?.length === 3 ? [pl.viewport[0], pl.viewport[1], pl.viewport[2]] : null,
            viewportSourceViewId: pl.viewportSourceViewId,
            verticalScale: pl.verticalScale,
            bounds: pl.bounds,
        });
    }

    return viewLinks;
}

export function toPersistedViewLinks(viewLinks: ViewLink[]): PersistedViewLink[] {
    return viewLinks.map((link) => ({
        id: link.id,
        color: link.color,
        viewIds: link.views.map((v) => v.id),
        viewport: link.viewport?.length === 3 ? [link.viewport[0], link.viewport[1], link.viewport[2]] : null,
        viewportSourceViewId: link.viewportSourceViewId,
        verticalScale: link.verticalScale,
        bounds: link.bounds,
    }));
}
