import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";

import { useAtomValue } from "jotai";

import { ViewAtoms } from "./atoms/atomDefinitions";
import { LayersWrapper } from "./components/layersWrapper";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";

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
    const wellboreCasingQuery = useWellboreCasingQuery(wellboreHeader?.uuid ?? undefined);

    // Set loading status
    statusWriter.setLoading(
        wellboreCasingQuery.isFetching || layersStatuses.some((status) => status.status === LayerStatus.LOADING)
    );

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full">
            <LayersWrapper
                referenceSystem={intersectionReferenceSystem}
                layers={layers}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                intersectionType={intersectionType}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={wellboreHeader?.uuid ?? null}
                wellboreHeaderDepthReferencePoint={wellboreHeader?.depthReferencePoint ?? null}
                wellboreHeaderDepthReferenceElevation={wellboreHeader?.depthReferenceElevation ?? null}
            />
        </div>
    );
}
