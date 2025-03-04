import React from "react";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { WellpickSelect } from "./WellpickSelect";

import { userSelectedWellPicksAtom } from "../atoms/baseAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "../atoms/persistedAtoms";

export type ViewerSettingsProps = {
    statusWriter: SettingsStatusWriter;
};

export function ViewerSettings(props: ViewerSettingsProps): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);
    const [padWithEmptyRows, setPadWithEmptyRows] = useAtom(padDataWithEmptyRowsAtom);
    const [userSelectedWellPicks, setUserSelectedWellPicks] = useAtom(userSelectedWellPicksAtom);
    const [addingWellpicks, setAddingWellpicks] = React.useState(!!userSelectedWellPicks.length);

    const onAddWellpickChange = React.useCallback(
        function onAddWellpickChange(_evt: unknown, checked: boolean) {
            // Reset selections if unchecked
            if (!checked) setUserSelectedWellPicks([]);

            setAddingWellpicks(checked);
        },
        [setUserSelectedWellPicks],
    );

    return (
        <div className="space-y-2">
            {/* TODO: Other settings, like, color, max cols, etc */}
            <Label text="Horizontal:" position="left" labelClassName="!mb-0">
                <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
            </Label>

            <Label text="Limit zoom to data:" position="left" labelClassName="!mb-0">
                <Checkbox checked={!padWithEmptyRows} onChange={(e, checked) => setPadWithEmptyRows(!checked)} />
            </Label>

            <Label text="Well picks:" position="left">
                <>
                    <Checkbox checked={addingWellpicks} onChange={onAddWellpickChange} />
                </>
            </Label>
            {addingWellpicks && (
                <div className="border-l-4 border-gray-300 p-1 pl-2 bg-gray-100 rounded-r ">
                    <WellpickSelect statusWriter={props.statusWriter} />
                </div>
            )}
        </div>
    );
}
