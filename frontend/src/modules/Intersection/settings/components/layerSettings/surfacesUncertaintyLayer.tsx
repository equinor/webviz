import React from "react";

import type { SurfaceMetaSet_api } from "@api";
import { SurfaceAttributeType_api, getRealizationSurfacesMetadataOptions } from "@api";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import type { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import type {
    SurfacesUncertaintyLayer,
    SurfacesUncertaintyLayerSettings,
} from "@modules/Intersection/utils/layers/SurfacesUncertaintyLayer";
import { SurfaceDirectory, SurfaceTimeType } from "@modules/_shared/Surface";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { cloneDeep, isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type SurfacesUncertaintyLayerSettingsComponentProps = {
    layer: SurfacesUncertaintyLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function SurfacesUncertaintyLayerSettingsComponent(
    props: SurfacesUncertaintyLayerSettingsComponentProps,
): React.ReactNode {
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<SurfacesUncertaintyLayerSettings>(cloneDeep(settings));
    const [prevSettings, setPrevSettings] = React.useState<SurfacesUncertaintyLayerSettings>(cloneDeep(settings));

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(settings);
        setNewSettings(settings);
    }

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        newSettings.ensembleIdent?.getCaseUuid(),
        newSettings.ensembleIdent?.getEnsembleName(),
    );

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getRegularEnsembleArray().map((el) => el.getIdent()),
        newSettings,
    );
    if (!isEqual(fixupEnsembleIdent, newSettings.ensembleIdent)) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent: fixupEnsembleIdent }));
    }

    if (fixupEnsembleIdent) {
        const fixupRealizationNums = fixupRealizationNumsSetting(
            newSettings.realizationNums,
            ensembleFilterFunc(fixupEnsembleIdent),
        );
        if (!isEqual(fixupRealizationNums, newSettings.realizationNums)) {
            setNewSettings((prev) => ({ ...prev, realizationNums: fixupRealizationNums }));
        }
    }

    const availableAttributes: string[] = [];
    const availableSurfaceNames: string[] = [];
    const surfaceDirectory = surfaceDirectoryQuery.data
        ? new SurfaceDirectory({
              useObservedSurfaces: false,
              realizationMetaSet: surfaceDirectoryQuery.data,
              timeType: SurfaceTimeType.None,
              includeAttributeTypes: [SurfaceAttributeType_api.DEPTH],
          })
        : null;

    if (surfaceDirectory) {
        availableAttributes.push(...surfaceDirectory.getAttributeNames(null));

        const fixupAttribute = fixupSetting("attribute", availableAttributes, newSettings);
        if (!isEqual(fixupAttribute, newSettings.attribute)) {
            setNewSettings((prev) => ({ ...prev, attribute: fixupAttribute }));
        }
    }

    if (surfaceDirectory && newSettings.attribute) {
        availableSurfaceNames.push(...surfaceDirectory.getSurfaceNames(newSettings.attribute));

        const fixupSurfaceNames = fixupSurfaceNamesSetting(newSettings.surfaceNames, availableSurfaceNames);
        if (!isEqual(fixupSurfaceNames, newSettings.surfaceNames)) {
            setNewSettings((prev) => ({ ...prev, surfaceNames: fixupSurfaceNames }));
        }

        props.layer.maybeRefetchData();
    }

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(cloneDeep(newSettings));
        },
        [newSettings, props.layer],
    );

    React.useEffect(
        function maybeRefetchData() {
            props.layer.setIsSuspended(surfaceDirectoryQuery.isFetching);
            if (!surfaceDirectoryQuery.isFetching) {
                props.layer.maybeRefetchData();
            }
        },
        [surfaceDirectoryQuery.isFetching, props.layer, newSettings],
    );

    function handleEnsembleChange(ensembleIdent: RegularEnsembleIdent | null) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent }));
    }

    function handleRealizationsChange(realizationNums: string[]) {
        setNewSettings((prev) => ({ ...prev, realizationNums: realizationNums.map((el) => parseInt(el)) }));
    }

    function handleAttributeChange(attribute: string) {
        setNewSettings((prev) => ({ ...prev, attribute }));
    }

    function handleSurfaceNamesChange(surfaceNames: string[]) {
        setNewSettings((prev) => ({ ...prev, surfaceNames }));
    }

    function handleResolutionChange(e: React.ChangeEvent<HTMLInputElement>) {
        setNewSettings((prev) => ({ ...prev, resolution: parseFloat(e.target.value) }));
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        props.layer.setColorSet(new ColorSet(colorPalette));
    }

    const availableRealizations: number[] = [];
    if (fixupEnsembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(fixupEnsembleIdent));
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell w-24 align-middle">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembles={props.ensembleSet.getRegularEnsembleArray()}
                        onChange={handleEnsembleChange}
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Realizations</div>
                <div className="table-cell">
                    <Select
                        options={makeRealizationOptions(availableRealizations)}
                        value={newSettings.realizationNums.map((el) => el.toString())}
                        onChange={handleRealizationsChange}
                        debounceTimeMs={600}
                        size={5}
                        multiple
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Attribute</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={surfaceDirectoryQuery.isFetching}
                        errorMessage={surfaceDirectoryQuery.error?.message}
                    >
                        <Dropdown
                            options={makeAttributeOptions(availableAttributes)}
                            value={newSettings.attribute ?? undefined}
                            onChange={handleAttributeChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-top">Surface names</div>
                <div className="table-cell max-w-0">
                    <PendingWrapper
                        isPending={surfaceDirectoryQuery.isFetching}
                        errorMessage={surfaceDirectoryQuery.error?.message}
                    >
                        <Select
                            options={makeSurfaceNameOptions(availableSurfaceNames)}
                            value={newSettings.surfaceNames ?? undefined}
                            onChange={handleSurfaceNamesChange}
                            size={5}
                            multiple
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Sample resolution</div>
                <div className="table-cell">
                    <Input
                        value={newSettings.resolution}
                        onChange={handleResolutionChange}
                        debounceTimeMs={600}
                        endAdornment="m"
                        type="number"
                        min={1}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Color set</div>
                <div className="table-cell">
                    <ColorPaletteSelector
                        type={ColorPaletteSelectorType.Categorical}
                        selectedColorPaletteId={props.layer.getColorSet().getColorPalette().getId()}
                        colorPalettes={defaultColorPalettes}
                        onChange={handleColorPaletteChange}
                    />
                </div>
            </div>
        </div>
    );
}

function makeRealizationOptions(realizations: readonly number[]): DropdownOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeAttributeOptions(attributes: string[]): DropdownOption[] {
    return attributes.map((attr) => ({ label: attr, value: attr }));
}

function makeSurfaceNameOptions(surfaceNames: string[]): DropdownOption[] {
    return surfaceNames.map((surfaceName) => ({ label: surfaceName, value: surfaceName }));
}

export function useSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        ...getRealizationSurfacesMetadataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName),
    });
}

function fixupRealizationNumsSetting(
    currentRealizationNums: readonly number[],
    validRealizationNums: readonly number[],
): number[] {
    if (validRealizationNums.length === 0) {
        return [...currentRealizationNums];
    }

    let adjustedRealizationNums = currentRealizationNums.filter((el) => validRealizationNums.includes(el));

    if (adjustedRealizationNums.length === 0) {
        adjustedRealizationNums = [...validRealizationNums];
    }

    return adjustedRealizationNums;
}

function fixupSurfaceNamesSetting(currentSurfaceNames: string[], validSurfaceNames: string[]): string[] {
    if (validSurfaceNames.length === 0) {
        return currentSurfaceNames;
    }

    let adjustedSurfaceNames = currentSurfaceNames.filter((el) => validSurfaceNames.includes(el));

    if (adjustedSurfaceNames.length === 0) {
        adjustedSurfaceNames = [validSurfaceNames[0]];
    }

    return adjustedSurfaceNames;
}
