import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { LayerStatus, useLayerSettings, useLayerStatus } from "@modules/Intersection/utils/layers/BaseLayer";
import { WellpicksLayer, WellpicksLayerSettings } from "@modules/Intersection/utils/layers/WellpicksLayer";

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

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(newSettings);
            props.layer.maybeRefetchData();
            setNewSettings({});
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
