import React from "react";

import { CircularProgress } from "@mui/material";
import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { propagateQueryErrorToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import type { InterfaceTypes } from "../interfaces";

import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { ProviderVisualizationWrapper } from "./components/ProviderVisualizationWrapper";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const providerManager = props.viewContext.useSettingsToViewInterfaceValue("providerManager");
    const selectedWellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const horizontalLayout = props.viewContext.useSettingsToViewInterfaceValue("horizontalLayout");
    const limitDomainToData = props.viewContext.useSettingsToViewInterfaceValue("limitDomainToData");

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);

    propagateQueryErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);

    React.useEffect(
        function setModuleName() {
            let title;

            if (selectedWellboreHeader?.uniqueWellboreIdentifier) {
                title = selectedWellboreHeader.uniqueWellboreIdentifier;
            } else {
                title = "Well log Viewer";
            }

            props.viewContext.setInstanceTitle(title);
        },
        [props.viewContext, selectedWellboreHeader?.uniqueWellboreIdentifier],
    );

    if (!providerManager || !wellboreTrajectoryDataQuery.data) {
        return (
            <div className="absolute z-10 flex h-full w-full items-center justify-center bg-white opacity-50">
                <CircularProgress />
            </div>
        );
    }

    return (
        <ProviderVisualizationWrapper
            providerManager={providerManager}
            wellboreHeader={selectedWellboreHeader}
            trajectoryData={wellboreTrajectoryDataQuery.data}
            horizontal={horizontalLayout}
            limitDomainToData={limitDomainToData}
            moduleProps={props}
        />
    );
}
