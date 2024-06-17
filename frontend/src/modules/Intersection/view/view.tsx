import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useAtomValue } from "jotai";

import { ViewAtoms } from "./atoms/atomDefinitions";
import { wellboreTrajectoryQueryAtom } from "./atoms/queryAtoms";
import { LayersWrapper } from "./components/layersWrapper";
import { useWellboreCasingsQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { selectedWellboreAtom } from "../sharedAtoms/sharedAtoms";
import { State } from "../state";
import { LayerStatus, useLayersStatuses } from "../utils/layers/BaseLayer";

export function View(
    props: ModuleViewProps<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>
): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const intersectionReferenceSystem = props.viewContext.useViewAtomValue("intersectionReferenceSystemAtom");
    const wellboreHeader = useAtomValue(selectedWellboreAtom);
    const wellboreTrajectoryQuery = useAtomValue(wellboreTrajectoryQueryAtom);

    const layers = props.viewContext.useViewAtomValue("layers");
    const layersStatuses = useLayersStatuses(layers);

    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const intersectionType = props.viewContext.useSettingsToViewInterfaceValue("intersectionType");

    React.useEffect(
        function handleTitleChange() {
            let ensembleName = "";
            if (ensembleIdent) {
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                ensembleName = ensemble?.getDisplayName() ?? "";
            }

            props.viewContext.setInstanceTitle(
                `${wellboreHeader?.identifier ?? "Intersection"}
            (${ensembleName})`
            );
        },
        [ensembleSet, ensembleIdent, wellboreHeader?.identifier, props.viewContext]
    );

    // Status messages
    for (const status of layersStatuses) {
        if (status.status === LayerStatus.ERROR) {
            statusWriter.addError(
                `Layer "${layers
                    .find((el) => el.getId() === status.id)
                    ?.getName()}" encountered an error while loading its data.`
            );
        }
    }

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingsQuery(wellboreHeader?.uuid ?? undefined);

    // Set loading status
    const mainElementsLoading =
        wellboreTrajectoryQuery.isFetching || layersStatuses.some((status) => status.status === LayerStatus.LOADING);
    statusWriter.setLoading(mainElementsLoading || wellboreCasingQuery.isFetching);

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center",
                    { hidden: !mainElementsLoading }
                )}
            >
                <CircularProgress />
            </div>
            <LayersWrapper
                referenceSystem={wellboreTrajectoryQuery.isFetching ? null : intersectionReferenceSystem}
                layers={wellboreTrajectoryQuery.isFetching ? [] : layers}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                intersectionType={intersectionType}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={wellboreTrajectoryQuery.isFetching ? null : wellboreHeader?.uuid ?? null}
                wellboreHeaderDepthReferencePoint={wellboreHeader?.depthReferencePoint ?? null}
                wellboreHeaderDepthReferenceElevation={wellboreHeader?.depthReferenceElevation ?? null}
            />
        </div>
    );
}
