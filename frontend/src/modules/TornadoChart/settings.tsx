import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";

import { DisplayComponentType, State } from "./state";

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const [displayComponentType, setDisplayComponentType] = moduleContext.useStoreState("displayComponentType");
    const [hideZeroY, setHideZeroY] = moduleContext.useStoreState("hideZeroY");
    const [showLabels, setShowLabels] = moduleContext.useStoreState("showLabels");
    const [showRealizationPoints, setShowRealizationPoints] = moduleContext.useStoreState("showRealizationPoints");
    const setModuleReferenceSensitivityName = moduleContext.useSetStoreValue("referenceSensitivityName");

    const [referenceSensitivityName, setReferenceSensitivityName] = React.useState<string | null>(null);

    const ensembleSet = workbenchSession.getEnsembleSet();

    React.useEffect(
        function propogateReferenceSensitivityName() {
            setModuleReferenceSensitivityName(referenceSensitivityName);
        },
        [referenceSensitivityName]
    );

    const responseReceiver = moduleContext.useChannelReceiver({
        idString: "response",
        expectedKindsOfKeys: [KeyKind.Realization],
    });

    const sensitivityNames: string[] = [];
    if (responseReceiver.hasActiveSubscription) {
        if (responseReceiver.channel.contents.length > 0 && responseReceiver.channel.contents[0].metaData) {
            const ensembleIdentString = responseReceiver.channel.contents[0].metaData.ensembleIdent;
            if (typeof ensembleIdentString === "string") {
                const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    sensitivityNames.push(
                        ...(ensemble
                            .getSensitivities()
                            ?.getSensitivityArr()
                            .map((el) => el.name) ?? [])
                    );
                }
            }
        }
    }

    if (!referenceSensitivityName && sensitivityNames.length > 0) {
        if (sensitivityNames.includes("rms_seed")) {
            setReferenceSensitivityName("rms_seed");
        } else {
            setReferenceSensitivityName(sensitivityNames[0]);
        }
    }

    function handleDisplayComponentChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setDisplayComponentType(value as DisplayComponentType);
    }

    function handleHideZeroYChange(event: React.ChangeEvent<HTMLInputElement>) {
        setHideZeroY(event.target.checked);
    }

    function handleShowLabelsChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowLabels(event.target.checked);
    }

    function handleShowRealizationPointsChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowRealizationPoints(event.target.checked);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Reference sensitivity" expanded>
                <Dropdown
                    value={referenceSensitivityName ?? ""}
                    options={sensitivityNames.map((s) => ({ label: s, value: s }))}
                    onChange={setReferenceSensitivityName}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="View component" expanded>
                <RadioGroup
                    value={displayComponentType}
                    options={[
                        {
                            label: "Tornado chart",
                            value: DisplayComponentType.TornadoChart,
                        },
                        {
                            label: "Table",
                            value: DisplayComponentType.Table,
                        },
                    ]}
                    onChange={handleDisplayComponentChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="View settings" expanded>
                <div className="flex flex-col gap-4">
                    <Label text="Show sensitivities without impact">
                        <Switch checked={hideZeroY} onChange={handleHideZeroYChange} />
                    </Label>
                    <Label text="Show labels">
                        <Switch
                            checked={showLabels}
                            onChange={handleShowLabelsChange}
                            disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        />
                    </Label>
                    <Label text="Show realization points">
                        <Switch
                            checked={showRealizationPoints}
                            onChange={handleShowRealizationPointsChange}
                            disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
