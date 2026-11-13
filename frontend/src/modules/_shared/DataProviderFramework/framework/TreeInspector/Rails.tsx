import type React from "react";

import { Popup as TooltipPopup } from "@lib/components/Tooltip/_components/popup";
import { Root as TooltipRoot } from "@lib/components/Tooltip/_components/root";
import { Trigger as TooltipTrigger } from "@lib/components/Tooltip/_components/trigger";

import type { Item } from "../../interfacesAndTypes/entities";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import type { SharedSetting } from "../SharedSetting/SharedSetting";

import type { Rail } from "./treeModel";
import { LANE_WIDTH_PX, ROW_HEIGHT_PX, getLaneStartX, getRailX } from "./treeModel";
import { useSharedSettingValueText } from "./TreeRowViews";

const STOP_SIZE_PX = 8;
const ORIGIN_SIZE_PX = 10;

function mix(color: string, isHot: boolean): string {
    return isHot ? color : `color-mix(in srgb, ${color} 50%, white)`;
}

export type RailMarkerProps = {
    rail: Rail;
    isOrigin: boolean;
    isHot: boolean;
    top: number;
};

export function RailMarker(props: RailMarkerProps): React.ReactNode {
    const size = props.isOrigin ? ORIGIN_SIZE_PX : STOP_SIZE_PX;
    return (
        <div
            className="absolute z-1"
            style={{
                width: size,
                height: size,
                left: getRailX(props.rail.lane) - size / 2,
                top: props.top - size / 2,
                borderRadius: props.isOrigin ? 2 : "50%",
                background: mix(props.rail.color, props.isHot),
            }}
        />
    );
}

export type RailsProps = {
    rails: Rail[];
    width: number;
    hotSourceIds: Set<string>;
    itemsById: Map<string, Item>;
    onHoverChange: (itemId: string | null) => void;
    onRailClick: (rail: Rail) => void;
};

/** "● name: value" for a shared setting, "● name" for a settings-group. */
function RailTooltipContent(props: { source: Item; color: string }): React.ReactNode {
    return (
        <span className="gap-x-2xs inline-flex items-center whitespace-nowrap">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: props.color }} />
            {props.source.getItemDelegate().getName()}
            {isSharedSetting(props.source) && <SharedSettingValueSuffix sharedSetting={props.source} />}
        </span>
    );
}

function SharedSettingValueSuffix(props: { sharedSetting: SharedSetting<any> }): React.ReactNode {
    const value = useSharedSettingValueText(props.sharedSetting);
    return <>: {value}</>;
}

type RailHitAreaProps = {
    rail: Rail;
    source: Item | undefined;
    top: number;
    height: number;
    onHoverChange: (itemId: string | null) => void;
    onClick: () => void;
};

/** The whole lane along the rail, so the 2px line doesn't have to be hit - shows the source in a tooltip. */
function RailHitArea(props: RailHitAreaProps): React.ReactNode {
    const { rail, source } = props;
    return (
        <TooltipRoot disabled={!source} trackCursorAxis="y">
            <TooltipTrigger delay="short">
                <div
                    className="pointer-events-auto absolute cursor-pointer"
                    style={{
                        left: getLaneStartX(rail.lane),
                        width: LANE_WIDTH_PX,
                        top: props.top,
                        height: props.height,
                    }}
                    onMouseEnter={() => props.onHoverChange(rail.sourceId)}
                    onMouseLeave={() => props.onHoverChange(null)}
                    onClick={props.onClick}
                />
            </TooltipTrigger>
            <TooltipPopup side="right">
                {source && <RailTooltipContent source={source} color={rail.color} />}
            </TooltipPopup>
        </TooltipRoot>
    );
}

export function Rails(props: RailsProps): React.ReactNode {
    return (
        <div className="pointer-events-none absolute top-0 bottom-0 left-0" style={{ width: props.width }}>
            {props.rails.map((rail) => {
                const isHot = props.hotSourceIds.has(rail.sourceId);
                const centerOf = (rowIndex: number) => rowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
                return (
                    <div key={rail.sourceId}>
                        <RailHitArea
                            rail={rail}
                            source={props.itemsById.get(rail.sourceId)}
                            top={rail.startRowIndex * ROW_HEIGHT_PX}
                            height={(rail.endRowIndex - rail.startRowIndex + 1) * ROW_HEIGHT_PX}
                            onHoverChange={props.onHoverChange}
                            onClick={() => props.onRailClick(rail)}
                        />
                        <div
                            className="absolute rounded-[1px]"
                            style={{
                                left: getRailX(rail.lane) - 1,
                                width: 2,
                                top: centerOf(rail.startRowIndex),
                                height: centerOf(rail.endRowIndex) - centerOf(rail.startRowIndex),
                                background: mix(rail.color, isHot),
                            }}
                        />
                        <RailMarker rail={rail} isOrigin isHot={isHot} top={centerOf(rail.sourceRowIndex)} />
                        {rail.stopRowIndices.map((rowIndex) => (
                            <RailMarker
                                key={rowIndex}
                                rail={rail}
                                isOrigin={false}
                                isHot={isHot}
                                top={centerOf(rowIndex)}
                            />
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
