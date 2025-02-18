import React from "react";

import { WellLogCurveTypeEnum_api } from "@api";
import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { SelectOption } from "@lib/components/Select";
import { SortableList } from "@lib/components/SortableList";
import { arrayMove } from "@lib/utils/arrays";
import { TrackIcon } from "@modules/WellLogViewer/_shared/components/icons";
import { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { configToJsonDataBlob, jsonFileToTrackConfigs } from "@modules/WellLogViewer/utils/settingsImport";
import { Dropdown, MenuButton } from "@mui/base";
import { FileDownload, FileUpload, MoreVert } from "@mui/icons-material";

import { useAtom } from "jotai";
import { v4 } from "uuid";

import { SortableTrackItem } from "./private-components/SortableTrackItem";

import { logViewerTrackConfigsAtom } from "../../atoms/persistedAtoms";
import { AddItemButton } from "../AddItemButton";

interface TemplateTrackSettingsProps {
    statusWriter: SettingsStatusWriter;
}

type TrackSelectOption = SelectOption<TemplateTrackConfig["_type"]>;
const TRACK_OPTIONS: TrackSelectOption[] = [
    {
        label: "Continous",
        value: WellLogCurveTypeEnum_api.CONTINUOUS,
        adornment: <TrackIcon type={WellLogCurveTypeEnum_api.CONTINUOUS} />,
    },
    {
        label: "Discrete",
        value: WellLogCurveTypeEnum_api.DISCRETE,
        adornment: <TrackIcon type={WellLogCurveTypeEnum_api.DISCRETE} />,
    },
];

export function TemplateTrackSettings(props: TemplateTrackSettingsProps): React.ReactNode {
    const [trackConfigs, setTrackConfigs] = useAtom(logViewerTrackConfigsAtom);
    const jsonImportInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleNewPlotTrack = React.useCallback(
        function handleNewPlotTrack(type: TrackSelectOption["value"]) {
            const newConfig = createNewConfig(`Plot track #${trackConfigs.length + 1}`, type);

            setTrackConfigs([...trackConfigs, newConfig]);
        },
        [setTrackConfigs, trackConfigs]
    );

    const handleDeleteTrack = React.useCallback(
        function handleDeleteTrack(track: TemplateTrackConfig) {
            setTrackConfigs(trackConfigs.filter((configs) => configs._key !== track._key));
        },
        [setTrackConfigs, trackConfigs]
    );

    const handleEditTrack = React.useCallback(
        function handleEditTrack(updatedItem: TemplateTrackConfig) {
            const newConfigs = trackConfigs.map((tc) => (tc._key === updatedItem._key ? updatedItem : tc));

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
            const currentPosition = trackConfigs.findIndex((cfg) => cfg._key === movedItemId);
            const newTrackCfg = arrayMove(trackConfigs, currentPosition, newPosition);

            setTrackConfigs(newTrackCfg);
        },
        [setTrackConfigs, trackConfigs]
    );

    const encodedConfigJsonUrl = React.useMemo(() => configToJsonDataBlob(trackConfigs), [trackConfigs]);

    const handleConfigJsonImport = React.useCallback(
        async function readUploadedFile(evt: React.ChangeEvent<HTMLInputElement>) {
            const file = evt.target.files?.item(0);
            if (!file) return console.warn("No file given");

            try {
                const newConfig = await jsonFileToTrackConfigs(file);

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

                <AddItemButton buttonText="Add track" options={TRACK_OPTIONS} onOptionClicked={handleNewPlotTrack} />
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
                        key={config._key}
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

function createNewConfig(title: string, type: TemplateTrackConfig["_type"]): TemplateTrackConfig {
    if (type === WellLogCurveTypeEnum_api.DISCRETE) {
        return {
            _key: v4(),
            _type: type,
            scale: "linear",
            width: 3,
            title,
            plots: [makeTrackPlot({ _curveHeader: null, type: "stacked" })],
        };
    }

    return {
        _key: v4(),
        _type: type,
        scale: "linear",
        width: 3,
        title,
        plots: [] as ReturnType<typeof makeTrackPlot>[],
    };
}
