import type React from "react";

import { useAtom } from "jotai";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";

import { horizontalLayoutAtom, limitDomainToDataAtom } from "../atoms/baseAtoms";

export function ViewerSettings(): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(horizontalLayoutAtom);
    const [limitDomainToData, setLimitDomainToData] = useAtom(limitDomainToDataAtom);

    return (
        <div className="space-y-2">
            {/* TODO: Other settings, like, color, max cols, etc */}
            <Label text="Horizontal:" position="left" labelClassName="mb-0!">
                <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
            </Label>

            <Label text="Limit zoom to data:" position="left" labelClassName="mb-0!">
                <Checkbox checked={limitDomainToData} onChange={(e, checked) => setLimitDomainToData(checked)} />
            </Label>
        </div>
    );
}
