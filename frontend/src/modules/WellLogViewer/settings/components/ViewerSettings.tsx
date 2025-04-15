import type React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";

import { useAtom } from "jotai";

import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "../atoms/persistedAtoms";

export function ViewerSettings(): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);
    const [padWithEmptyRows, setPadWithEmptyRows] = useAtom(padDataWithEmptyRowsAtom);

    return (
        <div className="space-y-2">
            {/* TODO: Other settings, like, color, max cols, etc */}
            <Label text="Horizontal:" position="left" labelClassName="mb-0!">
                <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
            </Label>

            <Label text="Limit zoom to data:" position="left" labelClassName="mb-0!">
                <Checkbox checked={!padWithEmptyRows} onChange={(e, checked) => setPadWithEmptyRows(!checked)} />
            </Label>
        </div>
    );
}
