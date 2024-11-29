import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { SortableList } from "@lib/components/SortableList";
import { arrayMove } from "@lib/utils/arrays";
import { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { transformToTrackConfigs } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { Dropdown, MenuButton } from "@mui/base";
import { FileDownload, FileUpload, MoreVert } from "@mui/icons-material";

import { useAtom } from "jotai";
import { v4 } from "uuid";

import { SortableTrackItem } from "./SortableTrackItem";

import { logViewerTrackConfigs } from "../../atoms/persistedAtoms";
import { AddItemButton } from "../AddItemButton";

interface TemplateTrackSettingsProps {
    statusWriter: SettingsStatusWriter;
}

export function TemplateTrackSettings(props: TemplateTrackSettingsProps): React.ReactNode {
    const [trackConfigs, setTrackConfigs] = useAtom(logViewerTrackConfigs);
    const jsonImportInputRef = React.useRef<HTMLInputElement | null>(null);

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
            const currentPosition = trackConfigs.findIndex((cfg) => cfg._id === movedItemId);
            const newTrackCfg = arrayMove(trackConfigs, currentPosition, newPosition);

            setTrackConfigs(newTrackCfg);
        },
        [setTrackConfigs, trackConfigs]
    );

    const encodedConfigJsonUrl = React.useMemo(
        function generateConfigJsonDataString() {
            if (trackConfigs.length === 0) return null;

            const configJSON = JSON.stringify(trackConfigs);
            return `data:text/json;charset=utf-8,${encodeURIComponent(configJSON)}`;
        },
        [trackConfigs]
    );

    const handleConfigJsonImport = React.useCallback(
        async function readUploadedFile(evt: React.ChangeEvent<HTMLInputElement>) {
            const file = evt.target.files?.item(0);

            if (!file) return console.warn("No file given");
            if (file.type !== "application/json") return window.alert("Invalid file extension");

            try {
                const fileData = await file.text();

                const parsedData = JSON.parse(fileData);
                const newConfig = transformToTrackConfigs(parsedData);

                setTrackConfigs(newConfig);
            } catch (error) {
                console.warn("Invalid JSON content");
                console.error(error);
                let errorMsg = "Unkown error";
                if (typeof error === "string") errorMsg = "error";
                if (error instanceof Error) errorMsg = error.message;

                window.alert("Invalid JSON content\n\n" + errorMsg);
            }
        },
        [setTrackConfigs]
    );

    return (
        <div className="h-full">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300">
                <input
                    ref={jsonImportInputRef}
                    className="hidden"
                    type="file"
                    accept=".json,text/json,application/json"
                    onChange={handleConfigJsonImport}
                />

                <div className="flex-grow font-bold text-sm">Plot Tracks</div>

                <AddItemButton buttonText="Add track" onAddClicked={handleNewPlotTrack} />
                <Dropdown>
                    <MenuButton className="py-0.5 px-1 text-sm rounded hover:bg-blue-100">
                        <MoreVert fontSize="inherit" />
                    </MenuButton>
                    <Menu anchorOrigin="bottom-end" className="text-sm">
                        <MenuItem disabled={!encodedConfigJsonUrl}>
                            <a
                                className="-mx-4 -my-2 px-4 py-2 flex items-center gap-2"
                                href={encodedConfigJsonUrl ?? undefined}
                                download="well-log-track-config.json"
                            >
                                <FileDownload fontSize="inherit" /> Export JSON
                            </a>
                        </MenuItem>
                        <MenuItem onClick={() => jsonImportInputRef.current?.click()}>
                            <FileUpload fontSize="inherit" /> Import JSON
                        </MenuItem>
                    </Menu>
                </Dropdown>
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
