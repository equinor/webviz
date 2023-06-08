import React from "react";

import { DynamicSurfaceDirectory, StaticSurfaceDirectory } from "@api";
import { SurfaceStatisticFunction } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Ensemble } from "@shared-types/ensemble";

import { useStaticSurfaceDirectoryQuery,useSeismicCubeDirectoryQuery } from "./queryHooks"
import { state } from "./state";
import { StaticSurfaceAccessor } from "./staticSurfaceAccessor";
import { StaticSurfaceSelector,StaticSurface } from "./StaticSurfaceSelector";
import { SeismicCubeSelector, SeismicCube } from "./SeismicCubeSelector";
import { Switch } from "@lib/components/Switch";
//-----------------------------------------------------------------------------------------------------------
export function settings({workbenchServices, moduleContext}: ModuleFCProps<state>) {
    // From Workbench
    const workbenchEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);

    //Just using the first ensemble for now
    const selectedEnsemble = workbenchEnsembles?.[0] ?? { caseUuid: null, ensembleName: null };

    
    
    
    const [selectedSurface, setSelectedSurface] = moduleContext.useStoreState("selectedSurface");
    const [selectedSeismicCube, setSelectedSeismicCube] = moduleContext.useStoreState("selectedSeismicCube");
    const [is3D, setIs3D] = moduleContext.useStoreState("show3D");

    const surfaceDirectoryQuery = useStaticSurfaceDirectoryQuery(
        selectedEnsemble?.caseUuid,
        selectedEnsemble?.ensembleName,
    );
    
    const seismicCubeQuery = useSeismicCubeDirectoryQuery(
        selectedEnsemble?.caseUuid,
        selectedEnsemble?.ensembleName,
    );

    if (!surfaceDirectoryQuery.data || !seismicCubeQuery.data) {
        return <CircularProgress />;
    }
    console.log("selected Surface", selectedSurface)
    console.log("selected SeismicCube", selectedSeismicCube)
    return (
        
            <div className={"space-y-4"}>
                <Label text={"Ensemble"}>
            <div>{selectedEnsemble.ensembleName}</div>
            </Label>
            <StaticSurfaceSelector surfaceDirectory={surfaceDirectoryQuery.data} selectedSurface={setSelectedSurface} />
            
            
            <SeismicCubeSelector seismicCubeDirectory={seismicCubeQuery.data} selectedSeismicCube={setSelectedSeismicCube} />
            
            <Label text={"Show 3D"} >
                <Switch   checked={is3D} onChange={(e) =>setIs3D(e.target.checked)} />
            </Label>
            <Label text={"Sampling window"}>
                <>
                <Label text={"Above"} >
                <Input
                    type="number"
                    value={5}
                    />
                    </Label>
                    <Label text={"Below"} >
                <Input
                    type="number"
                    value={5}
                    />
                    </Label>
                    </>
            </Label>
        </div>
    );
}

