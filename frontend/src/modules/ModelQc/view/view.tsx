import type React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Collapsible } from "@lib/components/Collapsible";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import type { Interfaces } from "../interfaces";

import { HydrostaticEquilibriumCheck } from "./checks/HydrostaticEquilibriumCheck";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const gridName = props.viewContext.useSettingsToViewInterfaceValue("gridName");
    const resolvedTimeSteps = props.viewContext.useSettingsToViewInterfaceValue("resolvedTimeSteps");
    const gridCheckRealizations = props.viewContext.useSettingsToViewInterfaceValue("gridCheckRealizations");
    const gridCheckThreshold = props.viewContext.useSettingsToViewInterfaceValue("gridCheckThreshold");

    const statusWriter = useViewStatusWriter(props.viewContext);

    const hasSelection = Boolean(ensembleIdent && gridName);

    if (!hasSelection) {
        return <ContentInfo>Select an ensemble and a grid model to run the quality control checks.</ContentInfo>;
    }

    return (
        <div className="flex h-full w-full flex-col gap-y-md overflow-auto p-md">
            <HydrostaticEquilibriumCheck
                ensembleIdent={ensembleIdent}
                gridName={gridName}
                resolvedTimeSteps={resolvedTimeSteps}
                gridCheckRealizations={gridCheckRealizations}
                gridCheckThreshold={gridCheckThreshold}
                statusWriter={statusWriter}
            />
            <Collapsible.Group title="Observation coverage" tone="neutral" adornment={"Not implemented yet"}>
                {" "}
            </Collapsible.Group>

            <Collapsible.Group
                title="Well log qc (raw/blocked/modelled)"
                tone="neutral"
                adornment={"Not implemented yet"}
            >
                {" "}
            </Collapsible.Group>
            <Collapsible.Group title="Facies distribution" tone="neutral" adornment={"Not implemented yet"}>
                {" "}
            </Collapsible.Group>
        </div>
    );
}

