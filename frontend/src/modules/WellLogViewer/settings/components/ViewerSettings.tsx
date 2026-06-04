import type React from "react";

import { useAtom } from "jotai";

import { SwitchCompositions } from "@lib/newComponents/Switch";

import { horizontalLayoutAtom, limitDomainToDataAtom } from "../atoms/baseAtoms";

export function ViewerSettings(): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(horizontalLayoutAtom);
    const [limitDomainToData, setLimitDomainToData] = useAtom(limitDomainToDataAtom);

    return (<>
        <SwitchCompositions.WithLabel label="Horizontal layout" checked={horizontal} onCheckedChange={setHorizontal} size="small" />
        <SwitchCompositions.WithLabel label="Limit zoom to data" checked={limitDomainToData} onCheckedChange={setLimitDomainToData} size="small" />
        </>
    );
}
