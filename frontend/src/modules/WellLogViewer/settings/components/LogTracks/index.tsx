import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { arrayMove } from "@framework/utils/arrays";
import { SortableList } from "@lib/components/SortableList";

import { useAtom } from "jotai";
import { v4 } from "uuid";

import { SortableTrackItem } from "./SortableTrackItem";

import { TemplateTrackConfig, logViewerTrackConfigs } from "../../atoms/persistedAtoms";
import { AddItemButton } from "../AddItemButton";

interface LogTracksProps {
    statusWriter: SettingsStatusWriter;
}

export function LogTracks(props: LogTracksProps): React.ReactNode {
    const [trackConfigs, setTrackConfigs] = useAtom(logViewerTrackConfigs);

    const handleNewPlotTrack = React.useCallback(
        function handleNewPlotTrack() {
            const newConfig = createNewConfig(`Plot track #${trackConfigs.length + 1}`);

            setTrackConfigs([...trackConfigs, newConfig]);
        },
        [setTrackConfigs, trackConfigs]
    );

    const handleDeleteTrack = React.useCallback(
        function handleDeleteTrack(track: TemplateTrackConfig) {
            setTrackConfigs(trackConfigs.filter((configs) => configs._id !== track._id));
        },
        [setTrackConfigs, trackConfigs]
    );

    const handleEditTrack = React.useCallback(
        function handleEditTrack(updatedItem: TemplateTrackConfig) {
            const newConfigs = trackConfigs.map((tc) => (tc._id === updatedItem._id ? updatedItem : tc));

            setTrackConfigs(newConfigs);
        },
        [setTrackConfigs, trackConfigs]
    );

    const handleTrackMove = React.useCallback(
        function handleTrackMove(
            movedItemId: string,
            originId: string | null,
            destinationId: string | null,
            newPosition: number
        ) {
            // Skip update if the item was moved above or below itself, as this means no actual move happened
            // TODO: This should probably be checked inside SortableList
            const currentPosition = trackConfigs.findIndex((cfg) => cfg._id === movedItemId);
            if (currentPosition === newPosition || currentPosition + 1 === newPosition) return;

            const newTrackCfg = arrayMove(trackConfigs, currentPosition, newPosition);

            setTrackConfigs(newTrackCfg);
        },
        [setTrackConfigs, trackConfigs]
    );

    return (
        <div className="h-full  [&_>_div]:!flex-grow-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300">
                <div className="flex-grow font-bold text-sm">Plot Tracks</div>
                <AddItemButton buttonText="Add track" onAddClicked={handleNewPlotTrack} />
            </div>

            <SortableList onItemMoved={handleTrackMove}>
                {trackConfigs.map((config) => (
                    <SortableTrackItem
                        key={config._id}
                        trackConfig={config}
                        statusWriter={props.statusWriter}
                        // Listeners
                        onUpdateTrack={handleEditTrack}
                        onDeleteTrack={handleDeleteTrack}
                    />
                ))}
            </SortableList>
        </div>
    );
}

function createNewConfig(title: string): TemplateTrackConfig {
    return {
        _id: v4(),
        plots: [],
        scale: "linear",
        width: 3,
        title,
    };
}
