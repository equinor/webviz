import React from "react";

import { InfoItem, ReadoutBox, ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import { TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import _ from "lodash";

import { DEFAULT_MAX_VISIBLE_TRACKS } from "../utils/logViewerTemplate";

export type ReadoutWrapperProps = {
    templateTracks: TemplateTrack[];
    wellLogReadout: Info[];
    hide?: boolean;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    if (_.maxBy(props.wellLogReadout, "iTrack")?.iTrack === -1) return null;

    const readoutItems = props.hide ? [] : parseWellLogReadout(props.wellLogReadout, props.templateTracks);

    return <ReadoutBox maxNumItems={DEFAULT_MAX_VISIBLE_TRACKS + 1} readoutItems={readoutItems} noLabelColor />;
}

function parseWellLogReadout(wellLogInfo: Info[], templateTracks: TemplateTrack[]): ReadoutItem[] {
    return _.chain(wellLogInfo)
        .filter(({ type }) => type !== "separator")
        .groupBy("iTrack")
        .entries()
        .sortBy(0)
        .map(([iTrack, infos]) => infoToReadoutItem(infos, Number(iTrack), templateTracks))
        .value();
}

function infoToReadoutItem(infos: Info[], iTrack: number, templateTracks: TemplateTrack[]): ReadoutItem {
    // The axis curves are printes with index -1
    if (iTrack === -1) {
        return {
            label: "Depth",
            info: infos.map(curveInfoToReadoutInfo),
        };
    } else {
        const trackTemplate = templateTracks[iTrack];
        return {
            label: trackTemplate.title,
            info: infos.map(curveInfoToReadoutInfo),
        };
    }
}

function curveInfoToReadoutInfo(info: Info): InfoItem {
    return {
        name: info.name ?? "",
        value: info.value,
        unit: info.units ?? "",
        adornment: <div className="w-2 h-2 rounded-full" style={{ background: info.color }} />,
    };
}
