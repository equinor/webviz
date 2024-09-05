import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { SortableListItem } from "@lib/components/SortableList";
import { Delete, ExpandLess, ExpandMore, Settings, Warning } from "@mui/icons-material";

import { TrackSettings } from "./TrackSettings";

import { TemplateTrackConfig } from "../../atoms/persistedAtoms";

export type CurveTrackItemProps = {
    trackConfig: TemplateTrackConfig;
    statusWriter: SettingsStatusWriter;
    onUpdateTrack: (newTrack: TemplateTrackConfig) => void;
    onDeleteTrack: (track: TemplateTrackConfig) => void;
};

export function SortableTrackItem(props: CurveTrackItemProps) {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

    const itemEndAdornment = (
        <ListItemEndAdornment
            track={props.trackConfig}
            isExpanded={isExpanded}
            onDeleteTrack={() => props.onDeleteTrack(props.trackConfig)}
            toggleExpanded={() => setIsExpanded(!isExpanded)}
        />
    );

    return (
        <SortableListItem id={props.trackConfig._id} title={props.trackConfig.title} endAdornment={itemEndAdornment}>
            <div hidden={!isExpanded}>
                <TrackSettings {...props} />
            </div>
        </SortableListItem>
    );
}

type ListItemEndAdornmentProps = {
    track: TemplateTrackConfig;
    isExpanded: boolean;
    onDeleteTrack?: () => void;
    toggleExpanded?: () => void;
};

function ListItemEndAdornment(props: ListItemEndAdornmentProps) {
    return (
        <>
            {props.track.plots.length < 1 && (
                <span title="Track has no plots!" className="text-yellow-500">
                    <Warning fontSize="inherit" />
                </span>
            )}

            <button
                className=" hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                title="Open track config"
                onClick={props.toggleExpanded}
            >
                <Settings fontSize="inherit" />
                {props.isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </button>
            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-xs text-red-800"
                title="Remove Track"
                onClick={props.onDeleteTrack}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );
}
