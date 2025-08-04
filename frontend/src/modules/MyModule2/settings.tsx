import type React from "react";

import { NumberInput } from "@mui/base/Unstable_NumberInput/NumberInput";
import { useAtom } from "jotai";

import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";

import { allowMultiSelectAtom, alternateColColorsAtom, amtOfDataAtom } from "./atoms";

export function Settings(): React.ReactNode {
    const [alternateCols, setAlternateCols] = useAtom(alternateColColorsAtom);
    const [allowMultiSelect, setAllowMultiSelect] = useAtom(allowMultiSelectAtom);
    const [amtOfData, setAmtOfData] = useAtom(amtOfDataAtom);

    return (
        <>
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

            <Label text="Alternating columns" position="left">
                <Switch checked={alternateCols} onChange={(e) => setAlternateCols(e.target.checked)} />
            </Label>
            <Label text="Multi-select" position="left">
                <Switch checked={allowMultiSelect} onChange={(e) => setAllowMultiSelect(e.target.checked)} />
            </Label>
        </>
    );
}

Settings.displayName = "Settings";
