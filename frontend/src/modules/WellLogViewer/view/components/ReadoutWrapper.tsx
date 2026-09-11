import type React from "react";

import type { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import { entries, groupBy, maxBy, sortBy } from "lodash-es";

import type { InfoItem, ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";
import type { TemplateTrack } from "@modules/_shared/types/wellLogTemplates";

const DEFAULT_MAX_READOUT_ITEMS = 6;

export type ReadoutWrapperProps = {
    templateTracks: TemplateTrack[];
    wellLogReadout: Info[];
    hide?: boolean;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    if (props.hide) return null;
    // This means that the log-viewer has no visible tracks
    if (maxBy(props.wellLogReadout, "iTrack")?.iTrack === -1) return null;

    const readoutItems = parseWellLogReadout(props.wellLogReadout, props.templateTracks);

    return <ReadoutBox maxNumItems={DEFAULT_MAX_READOUT_ITEMS} readoutItems={readoutItems} noLabelColor />;
}

function parseWellLogReadout(wellLogInfo: Info[], templateTracks: TemplateTrack[]): ReadoutItem[] {
    const nonSeparatorInfos = wellLogInfo.filter(({ type }) => type !== "separator");
    const infosByTrack = groupBy(nonSeparatorInfos, "iTrack");
    const sortedEntries = sortBy(entries(infosByTrack), ([iTrack]) => Number(iTrack));

    return sortedEntries.map(([iTrack, infos]) => infoToReadoutItem(infos, Number(iTrack), templateTracks));
}

function infoToReadoutItem(infos: Info[], iTrack: number, templateTracks: TemplateTrack[]): ReadoutItem {
    // The axis curves are given as index -1
    if (iTrack === -1) {
        return {
            id: "depth",
            label: "Depth",
            info: infos.map((info) => ({
                ...curveInfoToReadoutInfo(info),
                id: info.name ?? "N/A",
            })),
        };
    } else {
        const trackTemplate = templateTracks[iTrack];
        const trackLabel = trackTemplate.title ?? trackTemplate.plots[0]?.name ?? "";

        return {
            id: trackTemplate.id,
            label: trackLabel,
            info: infos.map((info, idx) => ({
                ...curveInfoToReadoutInfo(info),
                id: trackTemplate.plots[idx].id,
            })),
        };
    }
}

const CURVE_NAME_OVERRIDES: Record<string, string> = {
    RKB: "MD (RKB)",
    MSL: "TVD (MSL)",
};

function curveInfoToReadoutInfo(info: Info): Omit<InfoItem, "id"> {
    let name = info.name ?? "";
    name = CURVE_NAME_OVERRIDES[name] ?? name;

    return {
        name,
        value: info.discrete ?? info.value,
        unit: info.units ?? "",
        adornment: <div className="size-icon-xs rounded-full" style={{ background: info.color }} />,
    };
}
