import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { LayerStatus, useLayerSettings, useLayerStatus } from "@modules/Intersection/utils/layers/BaseLayer";
import { WellpicksLayer, WellpicksLayerSettings } from "@modules/Intersection/utils/layers/WellpicksLayer";

import { isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type WellpicksLayerSettingsComponentProps = {
    layer: WellpicksLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function WellpicksLayerSettingsComponent(props: WellpicksLayerSettingsComponentProps): React.ReactNode {
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<Partial<WellpicksLayerSettings>>({});

    const status = useLayerStatus(props.layer);

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        newSettings
    );
    if (!isEqual(fixupEnsembleIdent, newSettings.ensembleIdent)) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent: fixupEnsembleIdent }));
    }

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(newSettings);
            props.layer.maybeRefetchData();
        },
        [newSettings, props.layer]
    );

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent }));
    }

    function handleToggleFilterPicks(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setNewSettings((prev) => ({ ...prev, filterPicks: checked }));
    }

    function handleUnitPickSelectionChange(selectedUnitPicks: string[]) {
        setNewSettings((prev) => ({ ...prev, selectedUnitPicks }));
    }

    function handleNonUnitPickSelectionChange(selectedNonUnitPicks: string[]) {
        setNewSettings((prev) => ({ ...prev, selectedNonUnitPicks }));
    }

    const unitPicksFilterOptions: SelectOption[] = [];
    const nonUnitPicksFilterOptions: SelectOption[] = [];
    const data = props.layer.getData();
    if (data && props.layer.getStatus() === LayerStatus.SUCCESS) {
        unitPicksFilterOptions.push(
            ...Array.from(new Set(data.unitPicks.map((pick) => pick.name))).map((name) => ({
                label: name,
                value: name,
            }))
        );
        nonUnitPicksFilterOptions.push(
            ...Array.from(new Set(data.nonUnitPicks.map((pick) => pick.identifier))).map((identifier) => ({
                label: identifier,
                value: identifier,
            }))
        );
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell align-middle w-24">Stratigraphic column source</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle w-24">Filter picks</div>
                <div className="table-cell">
                    <Switch checked={settings.filterPicks} onChange={handleToggleFilterPicks} />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-top">Unit picks</div>
                <div className="table-cell">
                    <PendingWrapper isPending={status === LayerStatus.LOADING}>
                        <Select
                            options={unitPicksFilterOptions}
                            value={settings.selectedUnitPicks}
                            onChange={handleUnitPickSelectionChange}
                            multiple
                            size={5}
                            disabled={!settings.filterPicks}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-top">Non-unit picks</div>
                <div className="table-cell">
                    <PendingWrapper isPending={status === LayerStatus.LOADING}>
                        <Select
                            options={nonUnitPicksFilterOptions}
                            value={settings.selectedNonUnitPicks}
                            onChange={handleNonUnitPickSelectionChange}
                            multiple
                            size={5}
                            disabled={!settings.filterPicks}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
        </div>
    );
}
