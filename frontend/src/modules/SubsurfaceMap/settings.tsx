import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { SumoContent_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { SurfAddr, SurfAddrFactory } from "./SurfaceAddress";
import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";
import { AggregationSelector } from "./components/AggregationSelector";
import { PolygonDirectoryProvider } from "./polygonsDirectoryProvider";
import { useGetWellHeaders, usePolygonDirectoryQuery, useSurfaceDirectoryQuery } from "./queryHooks";
import { state } from "./state";
import { SurfaceDirectoryProvider } from "./surfaceDirectoryProvider";

//-----------------------------------------------------------------------------------------------------------
type LabelledCheckboxProps = {
    label: string;
    checked: boolean;
    onChange: any;
};

function LabelledCheckbox(props: LabelledCheckboxProps): JSX.Element {
    return (
        <Label wrapperClassName=" text-xs flow-root" labelClassName="float-left text-xs" text={props.label}>
            <div className=" float-right">
                <Checkbox onChange={props.onChange} checked={props.checked} />
            </div>
        </Label>
    );
}
function Header(props: { text: string }): JSX.Element {
    return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mt-2">{props.text}</label>;
}

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedMeshSurfaceName, setSelectedMeshSurfaceName] = React.useState<string | null>(null);
    const [selectedMeshSurfaceAttribute, setSelectedMeshSurfaceAttribute] = React.useState<string | null>(null);
    const [usePropertySurface, setUsePropertySurface] = React.useState<boolean>(false);
    const [selectedPropertySurfaceName, setSelectedPropertySurfaceName] = React.useState<string | null>(null);
    const [selectedPropertySurfaceAttribute, setSelectedPropertySurfaceAttribute] = React.useState<string | null>(null);
    const [selectedPolygonName, setSelectedPolygonName] = React.useState<string | null>(null);
    const [selectedPolygonAttribute, setSelectedPolygonAttribute] = React.useState<string | null>(null);
    const [linkPolygonNameToSurfaceName, setLinkPolygonNameToSurfaceName] = React.useState<boolean>(true);
    const [selectedWellUuids, setSelectedWellUuids] = moduleContext.useStoreState("selectedWellUuids");
    const [showPolygon, setShowPolygon] = React.useState<boolean>(true);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const [showContour, setShowContour] = React.useState(false);
    const [contourStartValue, setContourStartValue] = React.useState<number>(0);
    const [contourIncValue, setContourIncValue] = React.useState<number>(100);
    const [showGrid, setShowGrid] = React.useState(false);
    const [showSmoothShading, setShowSmoothShading] = React.useState(false);
    const [showMaterial, setShowMaterial] = React.useState(false);
    const [show3D, setShow3D] = React.useState(true);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    // Mesh surface
    const meshSurfDirQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName(),
        [SumoContent_api.DEPTH]
    );
    const meshSurfDirProvider = new SurfaceDirectoryProvider(meshSurfDirQuery, "tops");
    const computedMeshSurfaceName = meshSurfDirProvider.validateOrResetSurfaceName(selectedMeshSurfaceName);
    const computedMeshSurfaceAttribute = meshSurfDirProvider.validateOrResetSurfaceAttribute(
        computedMeshSurfaceName,
        selectedMeshSurfaceAttribute
    );

    if (computedMeshSurfaceName && computedMeshSurfaceName !== selectedMeshSurfaceName) {
        setSelectedMeshSurfaceName(computedMeshSurfaceName);
    }
    if (computedMeshSurfaceAttribute && computedMeshSurfaceAttribute !== selectedMeshSurfaceAttribute) {
        setSelectedMeshSurfaceAttribute(computedMeshSurfaceAttribute);
    }

    let meshSurfNameOptions: SelectOption[] = [];
    let meshSurfAttributeOptions: SelectOption[] = [];
    meshSurfNameOptions = meshSurfDirProvider.surfaceNames().map((name) => ({ value: name, label: name }));
    meshSurfAttributeOptions = meshSurfDirProvider
        .attributesForSurfaceName(computedMeshSurfaceName)
        .map((attr) => ({ value: attr, label: attr }));

    // Property surface
    const propertySurfDirQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName() // Should be SumoContent_api.PROPERTY
    );
    const propertySurfDirProvider = new SurfaceDirectoryProvider(propertySurfDirQuery, "formations");
    const computedPropertySurfaceName = propertySurfDirProvider.validateOrResetSurfaceName(selectedPropertySurfaceName);
    const computedPropertySurfaceAttribute = propertySurfDirProvider.validateOrResetSurfaceAttribute(
        computedPropertySurfaceName,
        selectedPropertySurfaceAttribute
    );
    if (computedPropertySurfaceName && computedPropertySurfaceName !== selectedPropertySurfaceName) {
        setSelectedPropertySurfaceName(computedPropertySurfaceName);
    }
    if (computedPropertySurfaceAttribute && computedPropertySurfaceAttribute !== selectedPropertySurfaceAttribute) {
        setSelectedPropertySurfaceAttribute(computedPropertySurfaceAttribute);
    }
    let propertySurfNameOptions: SelectOption[] = [];
    let propertySurfAttributeOptions: SelectOption[] = [];
    propertySurfNameOptions = propertySurfDirProvider.surfaceNames().map((name) => ({ value: name, label: name }));
    propertySurfAttributeOptions = propertySurfDirProvider
        .attributesForSurfaceName(computedPropertySurfaceName)
        .map((attr) => ({ value: attr, label: attr }));

    // Polygon
    const polygonDirQuery = usePolygonDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const polygonDirProvider = new PolygonDirectoryProvider(polygonDirQuery);

    const computedPolygonName = linkPolygonNameToSurfaceName
        ? polygonDirProvider.validateOrResetPolygonNameFromSurfaceName(computedMeshSurfaceName)
        : polygonDirProvider.validateOrResetPolygonName(selectedPolygonName);
    const computedPolygonAttribute = polygonDirProvider.validateOrResetPolygonAttribute(
        computedPolygonName,
        selectedPolygonAttribute
    );

    if (computedPolygonName && computedPolygonName !== selectedPolygonName) {
        setSelectedPolygonName(computedPolygonName);
    }
    if (computedPolygonAttribute && computedPolygonAttribute !== selectedPolygonAttribute) {
        setSelectedPolygonAttribute(computedPolygonAttribute);
    }
    let polyNameOptions: SelectOption[] = [];
    let polyAttributesOptions: SelectOption[] = [];
    polyNameOptions = polygonDirProvider.polygonNames().map((name) => ({ value: name, label: name }));
    polyAttributesOptions = polygonDirProvider
        .attributesForPolygonName(computedPolygonName)
        .map((attr) => ({ value: attr, label: attr }));

    React.useEffect(
        function propagateMeshSurfaceSelectionToView() {
            let surfAddr: SurfAddr | null = null;

            if (computedEnsembleIdent && computedMeshSurfaceName && computedMeshSurfaceAttribute) {
                const addrFactory = new SurfAddrFactory(
                    computedEnsembleIdent.getCaseUuid(),
                    computedEnsembleIdent.getEnsembleName(),
                    computedMeshSurfaceName,
                    computedMeshSurfaceAttribute
                );

                if (aggregation === null) {
                    surfAddr = addrFactory.createStaticAddr(realizationNum);
                } else {
                    surfAddr = addrFactory.createStatisticalStaticAddr(aggregation);
                }
            }

            console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
            moduleContext.getStateStore().setValue("meshSurfaceAddress", surfAddr);
        },
        [selectedEnsembleIdent, selectedMeshSurfaceName, selectedMeshSurfaceAttribute, aggregation, realizationNum]
    );
    React.useEffect(
        function propagatePropertySurfaceSelectionToView() {
            let surfAddr: SurfAddr | null = null;
            if (!usePropertySurface) {
                moduleContext.getStateStore().setValue("propertySurfaceAddress", surfAddr);
                return;
            }
            if (computedEnsembleIdent && computedPropertySurfaceName && computedPropertySurfaceAttribute) {
                const addrFactory = new SurfAddrFactory(
                    computedEnsembleIdent.getCaseUuid(),
                    computedEnsembleIdent.getEnsembleName(),
                    computedPropertySurfaceName,
                    computedPropertySurfaceAttribute
                );

                if (aggregation === null) {
                    surfAddr = addrFactory.createStaticAddr(realizationNum);
                } else {
                    surfAddr = addrFactory.createStatisticalStaticAddr(aggregation);
                }
            }

            console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
            moduleContext.getStateStore().setValue("propertySurfaceAddress", surfAddr);
        },
        [
            selectedEnsembleIdent,
            selectedPropertySurfaceName,
            selectedPropertySurfaceAttribute,
            aggregation,
            realizationNum,
            usePropertySurface,
        ]
    );
    React.useEffect(
        function propogatePolygonsSelectionToView() {
            let polygonAddr: SurfacePolygonsAddress | null = null;
            if (computedEnsembleIdent && computedPolygonName && computedPolygonAttribute && showPolygon) {
                polygonAddr = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    name: computedPolygonName,
                    attribute: computedPolygonAttribute,
                    realizationNum: realizationNum,
                };
            }

            moduleContext.getStateStore().setValue("polygonsAddress", polygonAddr);
        },
        [
            selectedEnsembleIdent,
            selectedMeshSurfaceName,
            selectedPolygonName,
            selectedPolygonAttribute,
            linkPolygonNameToSurfaceName,
            showPolygon,
            aggregation,
            realizationNum,
        ]
    );
    React.useEffect(
        function propogateSurfaceSettingsToView() {
            moduleContext.getStateStore().setValue("surfaceSettings", {
                contours: showContour ? [contourStartValue, contourIncValue] : false,
                gridLines: showGrid,
                smoothShading: showSmoothShading,
                material: showMaterial,
            });
        },
        [showContour, contourStartValue, contourIncValue, showGrid, showSmoothShading, showMaterial]
    );
    React.useEffect(
        function propogateSubsurfaceMapViewSettingsToView() {
            moduleContext.getStateStore().setValue("viewSettings", {
                show3d: show3D,
            });
        },
        [show3D]
    );

    const wellHeadersQuery = useGetWellHeaders(computedEnsembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }

    function handleWellsChange(selectedWellUuids: string[], allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = selectedWellUuids.filter((wellUuid) =>
            allWellUuidsOptions.some((wellHeader) => wellHeader.value === wellUuid)
        );
        setSelectedWellUuids(newSelectedWellUuids);
    }
    function showAllWells(allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = allWellUuidsOptions.map((wellHeader) => wellHeader.value);

        setSelectedWellUuids(newSelectedWellUuids);
    }
    function hideAllWells() {
        setSelectedWellUuids([]);
    }
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleMeshSurfNameSelectionChange(selectedSurfNames: string[]) {
        const newName = selectedSurfNames[0] ?? null;
        setSelectedMeshSurfaceName(newName);
        if (newName && computedMeshSurfaceAttribute) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: newName,
                attribute: computedMeshSurfaceAttribute,
            });
        }
    }
    function handleMeshSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedMeshSurfaceAttribute(newAttr);
        if (newAttr && computedMeshSurfaceName) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: computedMeshSurfaceName,
                attribute: newAttr,
            });
        }
    }
    function handlePropertySurfNameSelectionChange(selectedSurfNames: string[]) {
        const newName = selectedSurfNames[0] ?? null;
        setSelectedPropertySurfaceName(newName);
    }
    function handlePropertySurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedPropertySurfaceAttribute(newAttr);
    }
    function handlePolyNameSelectionChange(selectedPolyNames: string[]) {
        const newName = selectedPolyNames[0] ?? null;
        setSelectedPolygonName(newName);
    }
    function handlePolyAttributeSelectionChange(selectedPolyAttributes: string[]) {
        const newAttr = selectedPolyAttributes[0] ?? null;
        setSelectedPolygonAttribute(newAttr);
    }
    function handleAggregationChanged(aggregation: SurfaceStatisticFunction_api | null) {
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }
    function handleContourStartChange(event: React.ChangeEvent<HTMLInputElement>) {
        const contourStart = parseInt(event.target.value, 10);
        if (contourStart >= 0) {
            setContourStartValue(contourStart);
        }
    }
    function handleContourIncChange(event: React.ChangeEvent<HTMLInputElement>) {
        const contourInc = parseInt(event.target.value, 10);
        if (contourInc > 0) {
            setContourIncValue(contourInc);
        }
    }
    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble and realization">
                <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent ? computedEnsembleIdent : null}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
                <AggregationSelector
                    selectedAggregation={aggregation}
                    onAggregationSelectorChange={handleAggregationChanged}
                />
                {aggregation === null && (
                    <Label text="Realization:">
                        <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
                    </Label>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Depth surface">
                <ApiStateWrapper
                    apiResult={meshSurfDirQuery}
                    errorComponent={"Error loading surface directory"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label
                        text="Stratigraphic name"
                        labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                    >
                        <Select
                            options={meshSurfNameOptions}
                            value={computedMeshSurfaceName ? [computedMeshSurfaceName] : []}
                            onChange={handleMeshSurfNameSelectionChange}
                            size={5}
                        />
                    </Label>
                    <Label
                        text="Attribute"
                        labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                    >
                        <Select
                            options={meshSurfAttributeOptions}
                            value={computedMeshSurfaceAttribute ? [computedMeshSurfaceAttribute] : []}
                            onChange={handleMeshSurfAttributeSelectionChange}
                            size={5}
                        />
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Property surface (color)">
                <>
                    <Label
                        wrapperClassName=" flow-root mt-4 mb-2"
                        labelClassName="float-left block text-sm font-medium text-gray-700 dark:text-gray-200"
                        text={"Enable"}
                    >
                        <div className=" float-right">
                            <Checkbox
                                onChange={(e: any) => setUsePropertySurface(e.target.checked)}
                                checked={usePropertySurface}
                            />
                        </div>
                    </Label>
                    {usePropertySurface && (
                        <ApiStateWrapper
                            apiResult={propertySurfDirQuery}
                            errorComponent={"Error loading surface directory"}
                            loadingComponent={<CircularProgress />}
                        >
                            <Label
                                text="Stratigraphic name"
                                labelClassName={
                                    syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                                }
                            >
                                <Select
                                    options={propertySurfNameOptions}
                                    value={computedPropertySurfaceName ? [computedPropertySurfaceName] : []}
                                    onChange={handlePropertySurfNameSelectionChange}
                                    size={5}
                                />
                            </Label>
                            <Label
                                text="Attribute"
                                labelClassName={
                                    syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                                }
                            >
                                <Select
                                    options={propertySurfAttributeOptions}
                                    value={computedPropertySurfaceAttribute ? [computedPropertySurfaceAttribute] : []}
                                    onChange={handlePropertySurfAttributeSelectionChange}
                                    size={5}
                                />
                            </Label>
                        </ApiStateWrapper>
                    )}
                </>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Fault polygons">
                <Label
                    wrapperClassName=" flow-root mt-4 mb-2"
                    labelClassName="float-left block text-sm font-medium text-gray-700 dark:text-gray-200"
                    text={"Enable"}
                >
                    <div className=" float-right">
                        <Checkbox onChange={(e: any) => setShowPolygon(e.target.checked)} checked={showPolygon} />
                    </div>
                </Label>
                {showPolygon && (
                    <ApiStateWrapper
                        apiResult={polygonDirQuery}
                        errorComponent={"Error loading polygons directory"}
                        loadingComponent={<CircularProgress />}
                    >
                        <Label text="Stratigraphic name">
                            <>
                                <Label
                                    wrapperClassName=" flow-root"
                                    labelClassName="float-left"
                                    text={"Use surface stratigraphy"}
                                >
                                    <div className=" float-right">
                                        <Checkbox
                                            onChange={(e: any) => setLinkPolygonNameToSurfaceName(e.target.checked)}
                                            checked={linkPolygonNameToSurfaceName}
                                        />
                                    </div>
                                </Label>
                                <Select
                                    options={polyNameOptions}
                                    value={computedPolygonName ? [computedPolygonName] : []}
                                    onChange={handlePolyNameSelectionChange}
                                    size={5}
                                    disabled={linkPolygonNameToSurfaceName}
                                />
                            </>
                        </Label>

                        <Label text="Attribute">
                            <Select
                                options={polyAttributesOptions}
                                value={computedPolygonAttribute ? [computedPolygonAttribute] : []}
                                placeholder={
                                    linkPolygonNameToSurfaceName
                                        ? `No attributes found for ${computedMeshSurfaceName}`
                                        : `No attributes found for ${computedPolygonName}`
                                }
                                onChange={handlePolyAttributeSelectionChange}
                                size={5}
                            />
                        </Label>
                    </ApiStateWrapper>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Well data">
                <ApiStateWrapper
                    apiResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <>
                            <div>
                                <Button
                                    className="float-left m-2 text-xs py-0"
                                    variant="outlined"
                                    onClick={() => showAllWells(wellHeaderOptions)}
                                >
                                    Select all
                                </Button>
                                <Button className="m-2 text-xs py-0" variant="outlined" onClick={hideAllWells}>
                                    Select none
                                </Button>
                            </div>
                            <Select
                                options={wellHeaderOptions}
                                value={selectedWellUuids}
                                onChange={(selectedWellUuids: string[]) =>
                                    handleWellsChange(selectedWellUuids, wellHeaderOptions)
                                }
                                size={10}
                                multiple={true}
                            />
                        </>
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="View settings">
                <div>
                    <div className="p-2">
                        <Header text="Surface" />
                        <LabelledCheckbox
                            label="Contours"
                            checked={showContour}
                            onChange={(e: any) => setShowContour(e.target.checked)}
                        />
                        {showContour && (
                            <>
                                <Label
                                    wrapperClassName="  flex flex-row"
                                    labelClassName="text-xs"
                                    text={"Contour start/increment"}
                                >
                                    <>
                                        <div className=" float-right">
                                            <Input
                                                className="text-xs"
                                                type={"number"}
                                                value={contourStartValue}
                                                onChange={handleContourStartChange}
                                            />
                                        </div>
                                        <div className=" float-right">
                                            <Input
                                                className="text-xs"
                                                type={"number"}
                                                value={contourIncValue}
                                                onChange={handleContourIncChange}
                                            />
                                        </div>
                                    </>
                                </Label>
                            </>
                        )}
                        <LabelledCheckbox
                            label="Grid lines"
                            checked={showGrid}
                            onChange={(e: any) => setShowGrid(e.target.checked)}
                        />
                        <LabelledCheckbox
                            label="Smooth shading"
                            checked={showSmoothShading}
                            onChange={(e: any) => setShowSmoothShading(e.target.checked)}
                        />
                        <LabelledCheckbox
                            label="Material"
                            checked={showMaterial}
                            onChange={(e: any) => setShowMaterial(e.target.checked)}
                        />
                    </div>
                    <div className="p-2">
                        <Header text="View" />
                        <LabelledCheckbox
                            label="Show 3D"
                            checked={show3D}
                            onChange={(e: any) => setShow3D(e.target.checked)}
                        />
                    </div>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
