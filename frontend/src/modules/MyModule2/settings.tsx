import React from "react";

import { NumberInput } from "@mui/base/Unstable_NumberInput/NumberInput";
import { Check } from "@mui/icons-material";
import { useAtom } from "jotai";
import { random, range } from "lodash";

import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import type { TagProps } from "@lib/components/TagInput";
import type { TagOption, TagOptionProps } from "@lib/components/TagPicker";
import { TagPicker } from "@lib/components/TagPicker";
import { Tooltip } from "@lib/components/Tooltip";

import {
    allowMultiSelectAtom,
    alternateColColorsAtom,
    amtOfDataAtom,
    amtOfPendingDataAtom,
    fillPendingDataAtom,
} from "./atoms";

export function Settings(): React.ReactNode {
    const [alternateCols, setAlternateCols] = useAtom(alternateColColorsAtom);
    const [allowMultiSelect, setAllowMultiSelect] = useAtom(allowMultiSelectAtom);
    const [fillPendingData, setFillPendingData] = useAtom(fillPendingDataAtom);

    const [amtOfData, setAmtOfData] = useAtom(amtOfDataAtom);
    const [amtOfPendingData, setAmtOfPendingData] = useAtom(amtOfPendingDataAtom);

    const [tagSelection, setTagSelection] = React.useState<string[]>([]);
    const [tagSelection2, setTagSelection2] = React.useState<string[]>([]);

    const tags = React.useMemo(() => {
        return range(0, 100).map<TagOption>((i) => ({ value: String(i), label: `Tag ${i}` }));
    }, []);

    return (
        <>
            <div className="mb-4">
                <div className="mb-2 text-xs">Selected: {tagSelection.join(", ") || "none"}</div>
                <Label text="X/N selected">
                    <TagPicker
                        placeholder="Select tags"
                        tagOptions={tags}
                        selection={tagSelection}
                        showListAsSelectionCount
                        onChange={setTagSelection}
                    />
                </Label>
            </div>

            <div className="mb-12">
                <div className="mb-2 text-xs">Selected: {tagSelection2.join(", ") || "none"}</div>
                <Label text="Custom tags and options">
                    <TagPicker
                        placeholder="Select tags"
                        tagOptions={tags}
                        selection={tagSelection2}
                        onChange={setTagSelection2}
                        renderTag={(props) => <CoolTag {...props} />}
                        renderTagOption={(props) => <ExcitedTagOption {...props} />}
                    />
                </Label>
            </div>

            <Label text="Rows of data" position="left">
                <NumberInput
                    slotProps={{
                        input: {
                            className: "input-comp border rounded px-2 py-1 w-full",
                        },
                    }}
                    min={0}
                    max={10000}
                    value={amtOfData}
                    onChange={(evt, v) => setAmtOfData(v ?? 0)}
                />
            </Label>
            <Label text="Rows of pending data" position="left">
                <NumberInput
                    disabled={fillPendingData}
                    slotProps={{
                        input: {
                            className: "input-comp border rounded px-2 py-1 w-full",
                        },
                    }}
                    min={0}
                    max={10000}
                    value={amtOfPendingData}
                    onChange={(evt, v) => setAmtOfPendingData(v ?? 0)}
                />
            </Label>
            <Label text="Fill with pending data rows" position="left">
                <Switch checked={fillPendingData} onChange={(e) => setFillPendingData(e.target.checked)} />
            </Label>
            <Label text="Alternating columns" position="left">
                <Switch checked={alternateCols} onChange={(e) => setAlternateCols(e.target.checked)} />
            </Label>
            <Label text="Multi-select" position="left">
                <Switch checked={allowMultiSelect} onChange={(e) => setAllowMultiSelect(e.target.checked)} />
            </Label>

            <Tooltip title="This is default delay">
                <div className="p-1">This text has a tooltip with default delay</div>
            </Tooltip>
            <Tooltip title="This is short delay" enterDelay="short">
                <div className="p-1">This text has a tooltip with short delay</div>
            </Tooltip>
            <Tooltip title="This is medium delay" enterDelay="medium">
                <div className="p-1">This text has a tooltip with medium delay</div>
            </Tooltip>
            <Tooltip title="This is long delay" enterDelay="long">
                <div className="p-1">This text has a tooltip with long delay</div>
            </Tooltip>
        </>
    );
}

Settings.displayName = "Settings";

/** Two examples of custom tags and options */
function CoolTag(props: TagProps): React.ReactNode {
    return (
        <div
            className="text-xs flex items-center align-middle px-2 py-1 rounded text-white font-bold"
            style={{
                background:
                    "linear-gradient(270deg, #ff0000, #ff9900, #ffff00, #33ff00, #00ffff, #3300ff, #ff00cc, #ff0000)",
                backgroundSize: "1400% 1400%",
                animation: `gradientBG 3s linear infinite ${random(0, 0.15, true)}s`,
            }}
            onClick={props.onRemove}
        >
            {props.label ?? props.tag}
            <style>
                {`
                @keyframes gradientBG {
                    0% {background-position:0% 50%}
                    50% {background-position:100% 50%}
                    100% {background-position:0% 50%}
                }
            `}
            </style>
        </div>
    );
}

function ExcitedTagOption(props: TagOptionProps) {
    return (
        <li className="px-2 py-1  cursor-pointer" onClick={props.onToggle}>
            <span
                style={
                    props.isSelected
                        ? {
                              display: "inline-block",
                              animation: `vibrate 0.15s infinite linear ${random(0, 0.15, true)}s`,
                          }
                        : undefined
                }
            >
                {props.label ?? props.value}
                {props.isSelected && <Check className="ml-3" fontSize="inherit" />}
                <style>
                    {`@keyframes vibrate {
                        0% { transform: translate(0, 0); }
                        20% { transform: translate(-2px, 2px); }
                        40% { transform: translate(-2px, -2px); }
                        60% { transform: translate(2px, 2px); }
                        80% { transform: translate(2px, -2px); }
                        100% { transform: translate(0, 0); }
                    }`}
                </style>
            </span>
        </li>
    );
}
