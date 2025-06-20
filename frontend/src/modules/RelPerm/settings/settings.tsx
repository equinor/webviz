import type React from "react";

import { CircularProgress } from "@equinor/eds-core-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { QueriesErrorCriteria, QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { ColorBy, CurveType, GroupBy, VisualizationType } from "../typesAndEnums";
import { visualizationTypeAtom } from "../view/atoms/baseAtoms";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedRelPermCurveNamesAtom,
    userSelectedSatNumsAtom,
    userSelectedSaturationAxisAtom,
    userSelectedTableNameAtom,
} from "./atoms/baseAtoms";
import {
    availableRelPermCurveNamesAtom,
    availableRelPermSaturationAxesAtom,
    availableRelPermTableNamesAtom,
    availableSatNumsAtom,
    selectedEnsembleIdentsAtom,
    selectedRelPermCurveNamesAtom,
    selectedRelPermSaturationAxisAtom,
    selectedRelPermTableNameAtom,
    selectedSatNumsAtom,
} from "./atoms/derivedAtoms";
import { relPermTableInfoQueriesAtom, relPermTableNamesQueriesAtom } from "./atoms/queryAtoms";

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
    const [selectedGroupBy, setSelectedGroupBy] = useAtom(selectedGroupByAtom);
    const [selectedCurveType, setSelectedCurveType] = useAtom(selectedCurveTypeAtom);
    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(visualizationTypeAtom);
    const relPermTableNamesQuery = useAtomValue(relPermTableNamesQueriesAtom);
    const relPermTableInfoQuery = useAtomValue(relPermTableInfoQueriesAtom);
    const availableRelPermTableNames = useAtomValue(availableRelPermTableNamesAtom);
    const selecedRelPermTableName = useAtomValue(selectedRelPermTableNameAtom);
    const setUserSelectedRelPermTableName = useSetAtom(userSelectedTableNameAtom);

    const availableRelPermSaturationAxes = useAtomValue(availableRelPermSaturationAxesAtom);
    const selectedRelPermSaturationAxis = useAtomValue(selectedRelPermSaturationAxisAtom);
    const setUserSelectedRelPermSaturationAxis = useSetAtom(userSelectedSaturationAxisAtom);

    const availableRelPermCurveNames = useAtomValue(availableRelPermCurveNamesAtom);
    const selectedRelPermCurveNames = useAtomValue(selectedRelPermCurveNamesAtom);
    const setUserSelectedRelPermCurveNames = useSetAtom(userSelectedRelPermCurveNamesAtom);

    const availableSatNums = useAtomValue(availableSatNumsAtom);
    const selectedSatNums = useAtomValue(selectedSatNumsAtom);
    const setUserSelectedSatNums = useSetAtom(userSelectedSatNumsAtom);

    function handleEnsembleSelectChange(ensembleIdentArray: RegularEnsembleIdent[]) {
        setUserSelectedEnsembleIdents(ensembleIdentArray);
    }

    function handleSatNumsChange(values: string[]) {
        const newSatNums = values.map((value) => parseInt(value) as number);
        setUserSelectedSatNums(newSatNums);
    }
    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: ColorBy) {
        setSelectedColorBy(colorBy);
    }
    function handleGroupByChange(_: React.ChangeEvent<HTMLInputElement>, groupBy: string) {
        setSelectedGroupBy(groupBy as any);
    }
    function handleCurveTypeChange(_: React.ChangeEvent<HTMLInputElement>, curveType: CurveType) {
        setSelectedCurveType(curveType);
    }

    function handleSaturationAxisChange(_: React.ChangeEvent<HTMLInputElement>, axisname: string) {
        setUserSelectedRelPermSaturationAxis(axisname);
    }
    function handleVisualizationTypeChange(
        _: React.ChangeEvent<HTMLInputElement>,
        visualizationType: VisualizationType,
    ) {
        setSelectedVisualizationType(visualizationType);
    }
    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleSelect
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedEnsembleIdents}
                    allowDeltaEnsembles={false}
                    size={Math.min(ensembleSet.getRegularEnsembleArray().length, 5)}
                    onChange={handleEnsembleSelectChange}
                />
            </CollapsibleGroup>
            <QueryStateWrapper
                queryResults={relPermTableNamesQuery}
                loadingComponent={<CircularProgress />}
                showErrorWhen={QueriesErrorCriteria.ALL_QUERIES_HAVE_ERROR}
                errorComponent={"Could not load relperm tables"}
            >
                <CollapsibleGroup expanded={true} title="Table name">
                    <Dropdown
                        options={stringToOptions(availableRelPermTableNames)}
                        value={selecedRelPermTableName ?? ""}
                        onChange={setUserSelectedRelPermTableName}
                    />
                </CollapsibleGroup>
            </QueryStateWrapper>
            <QueryStateWrapper
                queryResults={relPermTableInfoQuery}
                loadingComponent={<CircularProgress />}
                showErrorWhen={QueriesErrorCriteria.ALL_QUERIES_HAVE_ERROR}
                errorComponent={"Could not load relperm tables"}
            >
                <CollapsibleGroup expanded={true} title="Curves and saturation">
                    <RadioGroup
                        options={[
                            { label: "Relative Permeability", value: CurveType.RELPERM },
                            { label: "Capillary Pressure", value: CurveType.CAP_PRESSURE },
                        ]}
                        value={selectedCurveType}
                        onChange={handleCurveTypeChange}
                    />
                    <Select
                        options={stringToOptions(availableRelPermCurveNames)}
                        value={selectedRelPermCurveNames ?? []}
                        onChange={setUserSelectedRelPermCurveNames}
                        size={2}
                        multiple
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Saturation axis">
                    <RadioGroup
                        options={stringToOptions(availableRelPermSaturationAxes)}
                        value={selectedRelPermSaturationAxis ?? ""}
                        onChange={handleSaturationAxisChange}
                        direction="horizontal"
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Visualizatione">
                    <RadioGroup
                        options={[
                            { label: "Individual Realizations", value: VisualizationType.INDIVIDUAL_REALIZATIONS },
                            { label: "Statistical Fanchart", value: VisualizationType.STATISTICAL_FANCHART },
                        ]}
                        value={selectedVisualizationType}
                        onChange={handleVisualizationTypeChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Color by">
                    <RadioGroup
                        options={[
                            { label: "Ensemble", value: ColorBy.ENSEMBLE },
                            { label: "Curve", value: ColorBy.CURVE },
                            { label: "Satnum", value: ColorBy.SATNUM },
                        ]}
                        value={selectedColorBy}
                        onChange={handleColorByChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Subplot by">
                    <RadioGroup
                        options={[
                            { label: "None", value: GroupBy.NONE },
                            { label: "Ensemble", value: GroupBy.ENSEMBLE },
                            { label: "Satnum", value: GroupBy.SATNUM },
                        ]}
                        value={selectedGroupBy}
                        onChange={handleGroupByChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Satnums">
                    <Select
                        options={stringToOptions(availableSatNums.map((num) => num.toString()))}
                        value={selectedSatNums ? selectedSatNums.map((num) => num.toString()) : []}
                        onChange={handleSatNumsChange}
                        size={10}
                        multiple
                    />
                </CollapsibleGroup>
            </QueryStateWrapper>
        </div>
    );
}
