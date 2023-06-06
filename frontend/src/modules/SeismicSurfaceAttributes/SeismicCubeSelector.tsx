import React, {ReactElement, useEffect} from "react";

import {  SeismicCubeSchema } from "@api";
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
import { SeismicCubeAccessor } from "./seismicCubeAccessor";
import { RadioGroup } from "@lib/components/RadioGroup";
import { set } from "lodash";


export type SeismicCube ={
    name: string;
    timestampOrTimestep: string
}
type SeismicCubeSelectorProps  = {
    seismicCubeDirectory: SeismicCubeSchema[]
    selectedSeismicCube?: (data: SeismicCube) => void;
}
enum TimeStampOrTimeStep {
    TIMESTAMP = "3D Survey",
    TIMESTEP = "4D Survey"
}
//-----------------------------------------------------------------------------------------------------------
export const SeismicCubeSelector = (props: SeismicCubeSelectorProps) : ReactElement =>{
    const [availableAttributes, setAvailableAttributes] = React.useState<string[]>([]);
    const [selectedAttribute, setSelectedAttribute] = React.useState<string>("");
    const [surveyType, setSurveyType] = React.useState<string>(TimeStampOrTimeStep.TIMESTEP);
    const [availableTimeSteps, setAvailableTimeSteps]   = React.useState<string[]>([]);
    const [availableTimeStamps, setAvailableTimeStamps] = React.useState<string[]>([]);
    const [selectedTimeStamp, setSelectedTimeStamp] = React.useState<string>("");
    const [selectedTimeStep, setSelectedTimeStep] = React.useState<string>("");

    // If the surface directory changes, update the available surface names and attributes, and verify current selections are valid
    useEffect(() => {
            const seismicCubeAccessor = new SeismicCubeAccessor(props.seismicCubeDirectory);
            const attributes = seismicCubeAccessor.getAllAttributes()
            setAvailableAttributes(attributes);
            if (selectedAttribute === "" || !attributes.includes(selectedAttribute)) {
                setSelectedAttribute(attributes[0]);
            }
            const updatedAvailableTimeStamps = seismicCubeAccessor.getTimeStampsForAttribute(attributes[0])
            const updatedAvailableTimeSteps = seismicCubeAccessor.getTimeStepsForAttribute(attributes[0])

            if (updatedAvailableTimeStamps !== availableTimeStamps ) {
                setAvailableTimeStamps(updatedAvailableTimeStamps);
            }
            
            if ((surveyType== TimeStampOrTimeStep.TIMESTAMP) && (selectedTimeStamp === null || updatedAvailableTimeStamps.includes(selectedTimeStamp))) {
                setSelectedTimeStamp(selectedTimeStamp);
            }

            
            if (updatedAvailableTimeSteps !== availableTimeSteps ) {
                setAvailableTimeSteps(updatedAvailableTimeSteps);
            }
            if ((surveyType== TimeStampOrTimeStep.TIMESTEP) && (selectedTimeStep === null || updatedAvailableTimeSteps.includes(selectedTimeStep))) {
                setSelectedTimeStep(selectedTimeStep);
            }
            
            
    }, [props.seismicCubeDirectory]);

    // Update the selected surface name and attribute in the parent component
    useEffect(() => {
        if (props.selectedSeismicCube) {
            
            props.selectedSeismicCube({name: selectedAttribute, timestampOrTimestep: surveyType==TimeStampOrTimeStep.TIMESTAMP?selectedTimeStamp:selectedTimeStep});
        }
    }, [selectedAttribute, selectedTimeStamp, selectedTimeStep, surveyType]);

    // If the selected surface name changes, update the available attributes and verify current attribute is valid
        // If the selected surface name changes, update the available attributes and verify current attribute is valid
    const onAttributeChange = (attribute: string) => {
        const seismicCubeAccessor = new SeismicCubeAccessor(props.seismicCubeDirectory);
        setSelectedAttribute(attribute);
        const updatedAvailableTimeStamps = seismicCubeAccessor.getTimeStampsForAttribute(attribute)
        const updatedAvailableTimeSteps = seismicCubeAccessor.getTimeStepsForAttribute(attribute)

        if (updatedAvailableTimeStamps !== availableTimeStamps ) {
            setAvailableTimeStamps(updatedAvailableTimeStamps);
        }
        
        if ((surveyType== TimeStampOrTimeStep.TIMESTAMP) && (selectedTimeStamp === null || updatedAvailableTimeStamps.includes(selectedTimeStamp))) {
            setSelectedTimeStamp(selectedTimeStamp);
        }

        
        if (updatedAvailableTimeSteps !== availableTimeSteps ) {
            setAvailableTimeSteps(updatedAvailableTimeSteps);
        }
        if ((surveyType== TimeStampOrTimeStep.TIMESTEP) && (selectedTimeStep === null || updatedAvailableTimeSteps.includes(selectedTimeStep))) {
            setSelectedTimeStep(selectedTimeStep);
        }
        
        };

    const onSurveyTypeChange = (surveyType: string) => {
        setSurveyType(surveyType);
           
    };
    
    return (
        <>           
         <Label text="Seismic attribute">
            <Dropdown
                options={availableAttributes.map((attr) => ({ label: attr, value: attr }))}
                value={selectedAttribute||""}
                onChange={onAttributeChange}
            /> 
        </Label>
            <Label text="Seismic survey">
                <>
            <RadioGroup 
                value={surveyType}
                direction="horizontal"
                options={Object.entries(TimeStampOrTimeStep)
                    .map(([value, label]) => ({
                        label: label as string,
                        value: label as string
                    }))}
                onChange={(e, val:any) => onSurveyTypeChange(val)}
                    />
        {surveyType==TimeStampOrTimeStep.TIMESTAMP ? 
            <Select size={5} options={availableTimeStamps.map(timeStamp => ({label:timeStamp, value:timeStamp}))} onChange={(val) => setSelectedTimeStamp(val?val[0]:"")}/> : 
            <Select size={5} options={availableTimeSteps.map(timeStep => ({label:timeStep, value:timeStep}))} onChange={(val) => setSelectedTimeStep(val?val[0]:"")}/>
        }
        </>
            </Label>

             
        </>
    );
}

