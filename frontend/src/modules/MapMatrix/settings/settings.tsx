import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { isEqual } from "lodash";
import { v4 as uuidv4 } from "uuid";

import { SurfaceAttributeTypeSelect } from "./components/surfaceAttributeTypeSelect";
import { SyncSettings } from "./components/syncSettings";
import { ViewSelect } from "./components/viewSelect";
import { WellSelect } from "./components/wellSelect";

import { useEnsembleSetSurfaceMetaQuery } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { useSurfaceReducer } from "../hooks/useSurfaceReducer";
import { State } from "../state";
import { EnsembleStageType, SyncedSettings, ViewSpecification } from "../types";

export function settings({ moduleContext, workbenchSession, workbenchSettings }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const reducer = useSurfaceReducer();

    const ensembleArr = ensembleSet.getEnsembleArr();
    const availableEnsembleIdents = ensembleArr.map((ensemble) => ensemble.getIdent());
    // Check if the ensemble idents in the state are still available
    const ensembleIdents = reducer.state.ensembleIdents.filter((ident) => availableEnsembleIdents.includes(ident));
    if (!isEqual(ensembleIdents, reducer.state.ensembleIdents)) {
        reducer.setEnsembleIdents(ensembleIdents);
    }

    const defaultColorScale = workbenchSettings
        .useContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        })
        .getColorPalette()
        .getId();

    function handleSyncedSettingsChange(syncedSettings: SyncedSettings) {
        reducer.setSyncedSettings(syncedSettings);
    }
    function handleAddView() {
        let newView: ViewSpecification = {
            ensembleIdent: null,
            surfaceName: null,
            surfaceAttribute: null,
            surfaceTimeOrInterval: null,
            realizationNum: null,
            uuid: uuidv4(),
            statisticFunction: SurfaceStatisticFunction_api.MEAN,
            realizationNumsStatistics: [],
            ensembleStage: EnsembleStageType.Realization,
            colorRange: null,
            colorPaletteId: defaultColorScale,
        };

        if (reducer.state.viewSpecifications.length) {
            newView = {
                ...reducer.state.viewSpecifications[reducer.state.viewSpecifications.length - 1],
                uuid: newView.uuid,
            };
        }
        reducer.addView(newView);
    }
    function handleViewChange(viewSpecification: ViewSpecification) {
        reducer.setView(viewSpecification);
    }
    function handleRemoveView(uuid: string) {
        reducer.removeView(uuid);
    }

    React.useEffect(
        function propogateViewSpecificationsToView() {
            moduleContext.getStateStore().setValue("viewSpecifications", reducer.state.viewSpecifications);
        },
        [reducer.state.viewSpecifications]
    );
    React.useEffect(
        function propogateWellsSpecificationToView() {
            moduleContext.getStateStore().setValue("wellsSpecification", reducer.state.wellsSpecification);
        },
        [reducer.state.wellsSpecification]
    );
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(reducer.state.ensembleIdents);

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <Label text="Ensembles">
                    <MultiEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={reducer.state.ensembleIdents}
                        onChange={reducer.setEnsembleIdents}
                        size={4}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Drilled Wellbores">
                <WellSelect
                    wellsSpecification={reducer.state.wellsSpecification}
                    onChange={reducer.setWellsSpecification}
                    ensembleIdent={reducer.state.ensembleIdents ? reducer.state.ensembleIdents[0] : null}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Link settings">
                <SyncSettings syncedSettings={reducer.state.syncedSettings} onChange={handleSyncedSettingsChange} />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Surface selections">
                <>
                    <SurfaceAttributeTypeSelect
                        onAttributeChange={reducer.setAttributeType}
                        onTimeModeChange={reducer.setTimeMode}
                        attributeType={reducer.state.attributeType}
                    />
                    <div className="m-2 flex gap-2 items-center">
                        <Button
                            variant={"contained"}
                            onClick={handleAddView}
                            disabled={reducer.state.ensembleIdents.length === 0}
                            startIcon={ensembleSetSurfaceMetas.isFetching ? <CircularProgress /> : null}
                        >
                            Add Surface
                        </Button>
                        {!reducer.state.ensembleIdents.length && "Select ensembles to add surfaces."}
                    </div>
                </>
            </CollapsibleGroup>
            <>
                <table className="table-auto w-full divide-y divide-gray-200">
                    <tbody>
                        {reducer.state.viewSpecifications.map((surfaceSpec, index) => (
                            <ViewSelect
                                index={index}
                                key={surfaceSpec.uuid}
                                surfaceMetas={ensembleSetSurfaceMetas}
                                viewSpecification={surfaceSpec}
                                ensembleIdents={reducer.state.ensembleIdents}
                                timeType={reducer.state.timeMode}
                                attributeType={reducer.state.attributeType}
                                syncedSettings={reducer.state.syncedSettings}
                                onChange={handleViewChange}
                                onRemove={handleRemoveView}
                                ensembleSet={ensembleSet}
                            />
                        ))}
                    </tbody>
                </table>
            </>
        </>
    );
}
