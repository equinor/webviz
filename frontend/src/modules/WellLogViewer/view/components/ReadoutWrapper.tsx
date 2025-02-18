import React from "react";

import { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { InfoItem, ReadoutBox, ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";

import _ from "lodash";

import { DEFAULT_MAX_VISIBLE_TRACKS } from "../../utils/logViewerTemplate";

export type ReadoutWrapperProps = {
    templateTracks: TemplateTrackConfig[];
    wellLogReadout: Info[];
    hide?: boolean;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    if (props.hide) return null;
    // This means that the log-viewer has no visible tracks
    if (_.maxBy(props.wellLogReadout, "iTrack")?.iTrack === -1) return null;

    const readoutItems = parseWellLogReadout(props.wellLogReadout, props.templateTracks);

    return <ReadoutBox maxNumItems={DEFAULT_MAX_VISIBLE_TRACKS + 1} readoutItems={readoutItems} noLabelColor />;
}

function parseWellLogReadout(wellLogInfo: Info[], templateTracks: TemplateTrackConfig[]): ReadoutItem[] {
    return _.chain(wellLogInfo)
        .filter(({ type }) => type !== "separator")
        .groupBy("iTrack")
        .entries()
        .sortBy(0)
        .map(([iTrack, infos]) => infoToReadoutItem(infos, Number(iTrack), templateTracks))
        .value();
}

function infoToReadoutItem(infos: Info[], iTrack: number, templateTracks: TemplateTrackConfig[]): ReadoutItem {
    // The axis curves are printes with index -1
    if (iTrack === -1) {
        return {
            label: "Depth",
            info: infos.map(curveInfoToReadoutInfo),
        };
    } else {
        const trackTemplate = templateTracks[iTrack];
        return {
            label: trackTemplate.title ?? trackTemplate.plots[0]?.name ?? "",
            info: infos.map(curveInfoToReadoutInfo),
        };
    }
}

const CURVE_NAME_OVERRIDES: Record<string, string> = {
    RKB: "MD (RKB)",
    MSL: "TVD (MSL)",
};

function curveInfoToReadoutInfo(info: Info): InfoItem {
    let name = info.name ?? "";
    name = CURVE_NAME_OVERRIDES[name] ?? name;

    return {
        value: info.discrete ?? info.value,
        unit: info.units ?? "",
        adornment: <div className="w-2 h-2 rounded-full" style={{ background: info.color }} />,
        name,
    };
}
