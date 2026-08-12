import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { InterfaceTypes } from "../interfaces";

import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { ProviderVisualizationWrapper } from "./components/ProviderVisualizationWrapper";

export function View(props: ModuleViewProps<InterfaceTypes>) {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const providerManager = props.viewContext.useSettingsToViewInterfaceValue("providerManager");
    const { header: selectedWellboreHeader, isLoading: isLoadingWellboreHeaders } =
        props.viewContext.useSettingsToViewInterfaceValue("wellboreHeaderStatus");
    const horizontalLayout = props.viewContext.useSettingsToViewInterfaceValue("horizontalLayout");
    const limitDomainToData = props.viewContext.useSettingsToViewInterfaceValue("limitDomainToData");

    const wellboreTrajectoryDataQuery = useAtomValue(wellboreTrajectoryQueryAtom);

    const propagatedErrorMessage = usePropagateQueryErrorToStatusWriter(wellboreTrajectoryDataQuery, statusWriter);

    // Only treat the trajectory query's pending state as "loading" once a wellbore is actually
    // selected; while nothing is selected the query is intentionally disabled and stays pending forever.
    const isLoading =
        !providerManager ||
        isLoadingWellboreHeaders ||
        (Boolean(selectedWellboreHeader) && wellboreTrajectoryDataQuery.isPending);

    statusWriter.setLoading(isLoading);

    React.useEffect(
        function setModuleName() {
            let title = "";

            if (selectedWellboreHeader?.uniqueWellboreIdentifier) {
                title = selectedWellboreHeader.uniqueWellboreIdentifier;
            } else {
                title = "Well log Viewer";
            }

            props.viewContext.setInstanceTitle(title);
        },
        [props.viewContext, selectedWellboreHeader?.uniqueWellboreIdentifier],
    );

    let infoMessage: string | undefined;
    let errorMessage: string | undefined;
    if (!isLoading) {
        if (!selectedWellboreHeader) {
            infoMessage = "No wellbore selected.";
        } else if (wellboreTrajectoryDataQuery.isError) {
            errorMessage = propagatedErrorMessage ?? "Could not load wellbore trajectory data.";
        } else if (!wellboreTrajectoryDataQuery.data) {
            infoMessage = "No wellbore trajectory data found.";
        }
    }

    return (
        <StatusWrapper className="h-full" isPending={isLoading} infoMessage={infoMessage} errorMessage={errorMessage}>
            {providerManager && selectedWellboreHeader && wellboreTrajectoryDataQuery.data && (
                <ProviderVisualizationWrapper
                    providerManager={providerManager}
                    wellboreHeader={selectedWellboreHeader}
                    trajectoryData={wellboreTrajectoryDataQuery.data}
                    horizontal={horizontalLayout}
                    limitDomainToData={limitDomainToData}
                    moduleProps={props}
                />
            )}
        </StatusWrapper>
    );
}
