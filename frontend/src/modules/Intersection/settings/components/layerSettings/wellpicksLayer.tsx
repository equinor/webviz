import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { LayerStatus, useLayerStatus } from "@modules/Intersection/utils/layers/BaseLayer";
import { WellpicksLayer, WellpicksLayerSettings } from "@modules/Intersection/utils/layers/WellpicksLayer";

import { isEqual } from "lodash";

export type WellpicksLayerSettingsComponentProps = {
    layer: WellpicksLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function WellpicksLayerSettingsComponent(props: WellpicksLayerSettingsComponentProps): React.ReactNode {
    const [newSettings, setNewSettings] = React.useState<WellpicksLayerSettings>(props.layer.getSettings());
    const settings = props.layer.getSettings();
    const [prevSettings, setPrevSettings] = React.useState<WellpicksLayerSettings>(settings);

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(settings);
        setNewSettings(settings);
    }

    const status = useLayerStatus(props.layer);

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(newSettings);
            props.layer.maybeRefetchData();
        },
        [newSettings, props.layer]
    );

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
    if (data) {
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
                <div className="table-cell align-middle w-24">Filter picks</div>
                <div className="table-cell">
                    <Switch checked={newSettings.filterPicks} onChange={handleToggleFilterPicks} />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-top">Unit picks</div>
                <div className="table-cell">
                    <PendingWrapper isPending={status === LayerStatus.LOADING}>
                        <Select
                            options={unitPicksFilterOptions}
                            value={newSettings.selectedUnitPicks}
                            onChange={handleUnitPickSelectionChange}
                            multiple
                            size={5}
                            disabled={!newSettings.filterPicks}
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
                            value={newSettings.selectedNonUnitPicks}
                            onChange={handleNonUnitPickSelectionChange}
                            multiple
                            size={5}
                            disabled={!newSettings.filterPicks}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
        </div>
    );
}
