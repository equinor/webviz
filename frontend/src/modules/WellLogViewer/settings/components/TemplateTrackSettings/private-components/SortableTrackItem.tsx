import React from "react";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { Delete, ExpandLess, ExpandMore, Settings, Warning } from "@mui/icons-material";

import { TrackSettings } from "./TrackSettings";

export type CurveTrackItemProps = {
    trackConfig: TemplateTrackConfig;
    statusWriter: SettingsStatusWriter;
    onUpdateTrack: (newTrack: TemplateTrackConfig) => void;
    onDeleteTrack: (track: TemplateTrackConfig) => void;
};

export function SortableTrackItem(props: CurveTrackItemProps) {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

    const itemStartAdornment = <TrackIcon type={props.trackConfig._type} />;

    const itemEndAdornment = (
        <ListItemEndAdornment
            track={props.trackConfig}
            isExpanded={isExpanded}
            onDeleteTrack={() => props.onDeleteTrack(props.trackConfig)}
            toggleExpanded={() => setIsExpanded(!isExpanded)}
        />
    );

    return (
        <SortableListItem
            id={props.trackConfig._key}
            title={props.trackConfig.title}
            startAdornment={itemStartAdornment}
            endAdornment={itemEndAdornment}
        >
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

            <DenseIconButton title="Open track config" onClick={props.toggleExpanded}>
                <Settings fontSize="inherit" />
                {props.isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </DenseIconButton>

            <DenseIconButton
                title="Remove Track"
                colorScheme={DenseIconButtonColorScheme.DANGER}
                onClick={props.onDeleteTrack}
            >
                <Delete className="text-red-800" fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
