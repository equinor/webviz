import React, {ReactElement, useEffect} from "react";

import {  StaticSurfaceDirectory } from "@api";
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

import { useStaticSurfaceDirectoryQuery,useSeismicAttributeNearSurfaceQuery } from "./queryHooks"
import { state } from "./state";
import { StaticSurfaceAccessor } from "./staticSurfaceAccessor";


export type StaticSurface ={
    name: string;
    attribute: string;
}
type StaticSurfaceSelectorProps  = {
    surfaceDirectory: StaticSurfaceDirectory
    selectedSurface?: (data: StaticSurface) => void;
}
//-----------------------------------------------------------------------------------------------------------
export const StaticSurfaceSelector = (props: StaticSurfaceSelectorProps) : ReactElement =>{
    const [availableSurfaceNames, setAvailableSurfaceNames] = React.useState<string[]>([]);
    const [availableSurfaceAttributes, setAvailableSurfaceAttributes] = React.useState<string[]>([]);
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string >("");
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string  >("");
    
    // If the surface directory changes, update the available surface names and attributes, and verify current selections are valid
    useEffect(() => {
            const surfaceAccessor = new StaticSurfaceAccessor(props.surfaceDirectory);
            const updatedAvailableSurfaceNames = surfaceAccessor.getAllNames();
            const updatedSurfaceName = updatedAvailableSurfaceNames.includes(selectedSurfaceName) ? selectedSurfaceName : updatedAvailableSurfaceNames?.[0]||"";
            const updatedAvailableAttributes = surfaceAccessor.getAttributesForName(updatedSurfaceName);
            const updatedAttribute = updatedAvailableAttributes.includes(selectedSurfaceAttribute) ? selectedSurfaceAttribute : updatedAvailableAttributes?.[0]||"";
            if (updatedAvailableSurfaceNames !== availableSurfaceNames ) {
                setAvailableSurfaceNames(updatedAvailableSurfaceNames);
            }
            if (updatedAvailableAttributes !== availableSurfaceAttributes ) {
                setAvailableSurfaceAttributes(updatedAvailableAttributes);
            }
            if (updatedSurfaceName !== selectedSurfaceName ) {
                setSelectedSurfaceName(updatedSurfaceName);
            }
            if (updatedAttribute !== selectedSurfaceAttribute ) {
                setSelectedSurfaceAttribute(updatedAttribute);
            }
            
            
    }, [props.surfaceDirectory]);

    // Update the selected surface name and attribute in the parent component
    useEffect(() => {
        if (props.selectedSurface) {
            props.selectedSurface({name: selectedSurfaceName, attribute: selectedSurfaceAttribute});
        }
    }, [selectedSurfaceName, selectedSurfaceAttribute]);

    // If the selected surface name changes, update the available attributes and verify current attribute is valid
    const onNameChange = (name: string) => {
        const surfaceAccessor = new StaticSurfaceAccessor(props.surfaceDirectory);
        setSelectedSurfaceName(name);
        const updatedAvailableAttributes = surfaceAccessor.getAttributesForName(name);
        if (availableSurfaceAttributes !== updatedAvailableAttributes ) {
            setAvailableSurfaceAttributes(updatedAvailableAttributes);

        }
        if (!updatedAvailableAttributes.includes(selectedSurfaceAttribute)) { 

            setSelectedSurfaceAttribute(updatedAvailableAttributes?.[0]||"");
        }
    };


    
    return (
        <>
            <Label text="Horizon/surface pair for attribute extraction">
            <Dropdown
                options={availableSurfaceNames.map((name) => ({ label: name, value: name }))}
                value={selectedSurfaceName||""}
                onChange={onNameChange}
            /> 
            </Label>
            
            <Dropdown
                options={availableSurfaceAttributes.map((attr) => ({ label: attr, value: attr }))}
                value={selectedSurfaceAttribute||""}
                onChange={setSelectedSurfaceAttribute}
            /> 
            
            
        </>
    );
}

