import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";

import { DisplayComponentType, State } from "./state";

export function Settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
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
        [referenceSensitivityName, setModuleReferenceSensitivityName]
    );

    const responseReceiver = moduleContext.useChannelReceiver({
        idString: "response",
        expectedKindsOfKeys: [KeyKind.Realization],
    });

    const sensitivityNames: string[] = [];
    if (responseReceiver.hasActiveSubscription) {
        if (
            responseReceiver.channel.contents.length > 0 &&
            responseReceiver.channel.contents[0].metaData.ensembleIdentString
        ) {
            const ensembleIdentString = responseReceiver.channel.contents[0].metaData.ensembleIdentString;
            if (typeof ensembleIdentString === "string") {
                try {
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
                } catch (e) {
                    console.error(e);
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
                    <Checkbox
                        checked={hideZeroY}
                        onChange={handleHideZeroYChange}
                        label="Show sensitivities without impact"
                    />
                    <Checkbox
                        checked={showLabels}
                        onChange={handleShowLabelsChange}
                        disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        label="Show labels"
                    />
                    <Checkbox
                        checked={showRealizationPoints}
                        onChange={handleShowRealizationPointsChange}
                        disabled={displayComponentType !== DisplayComponentType.TornadoChart}
                        label="Show realization points"
                    />
                </div>
            </CollapsibleGroup>
        </div>
    );
}
