import { useAtom } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { PersistableAtomState, Source } from "@framework/utils/atomUtils";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";

import {
    downstreamAtom,
    precomputedAtom,
    simpleNumberAtom,
    upstreamAtom,
} from "./atoms/persistableFixableAtoms";

export function Settings({}: ModuleSettingsProps<Interfaces>) {
    const [simpleNumber, setSimpleNumber] = useAtom(simpleNumberAtom);
    const [upstream, setUpstream] = useAtom(upstreamAtom);
    const [downstream, setDownstream] = useAtom(downstreamAtom);
    const [precomputed, setPrecomputed] = useAtom(precomputedAtom);

    const simpleNumberAnnotations = useMakePersistableFixableAtomAnnotations(simpleNumberAtom);
    const upstreamAnnotations = useMakePersistableFixableAtomAnnotations(upstreamAtom);
    const downstreamAnnotations = useMakePersistableFixableAtomAnnotations(downstreamAtom);
    const precomputedAnnotations = useMakePersistableFixableAtomAnnotations(precomputedAtom);

    // Helper to set invalid values as PERSISTENCE source to bypass auto-fix
    const setAsInvalidPersisted = (
        setter: (value: number | PersistableAtomState<number>) => void,
        value: number
    ) => {
        setter({ value, _source: Source.PERSISTENCE } as PersistableAtomState<number>);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="text-sm text-gray-600">
                This module demonstrates the auto-transition behavior of persistableFixableAtom. Load a snapshot to see
                how atoms transition from PERSISTENCE to USER source when they become valid.
            </div>

            <CollapsibleGroup title="Simple Number Atom" expanded>
                <SettingWrapper annotations={simpleNumberAnnotations}>
                    <div className="flex flex-col gap-2">
                        <Label text="Value (must be 1-100)">
                            <Input
                                type="number"
                                value={simpleNumber.value}
                                onChange={(e) => setSimpleNumber(parseFloat(e.target.value) || 0)}
                            />
                        </Label>
                        <div className="flex gap-2">
                            <Button onClick={() => setAsInvalidPersisted(setSimpleNumber, 150)} size="small">
                                Set Invalid (150) as PERSISTENCE
                            </Button>
                            <Button onClick={() => setSimpleNumber(50)} size="small">
                                Set Valid (50) as USER
                            </Button>
                        </div>
                        <div className="text-xs text-gray-500">
                            Valid: {simpleNumber.isValidInContext ? "✓" : "✗"} | Source: {simpleNumber._source}
                        </div>
                    </div>
                </SettingWrapper>
            </CollapsibleGroup>

            <CollapsibleGroup title="Cascading Dependency Test" expanded>
                <div className="flex flex-col gap-4">
                    <div className="text-sm text-gray-600">
                        Upstream and Downstream atoms demonstrate cascading dependencies. When Upstream changes,
                        Downstream may become invalid. If Downstream's source is USER, it auto-fixes.
                    </div>

                    <SettingWrapper annotations={upstreamAnnotations}>
                        <div className="flex flex-col gap-2">
                            <Label text="Upstream (must be positive)">
                                <Input
                                    type="number"
                                    value={upstream.value}
                                    onChange={(e) => setUpstream(parseFloat(e.target.value) || 0)}
                                />
                            </Label>
                            <div className="flex gap-2">
                                <Button onClick={() => setAsInvalidPersisted(setUpstream, -5)} size="small">
                                    Set Invalid (-5) as PERSISTENCE
                                </Button>
                                <Button onClick={() => setUpstream(10)} size="small">
                                    Set Valid (10) as USER
                                </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                                Valid: {upstream.isValidInContext ? "✓" : "✗"} | Source: {upstream._source}
                            </div>
                        </div>
                    </SettingWrapper>

                    <SettingWrapper annotations={downstreamAnnotations}>
                        <div className="flex flex-col gap-2">
                            <Label text="Downstream (must be > Upstream)">
                                <Input
                                    type="number"
                                    value={downstream.value}
                                    onChange={(e) => setDownstream(parseFloat(e.target.value) || 0)}
                                />
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setAsInvalidPersisted(setDownstream, upstream.value - 5)}
                                    size="small"
                                >
                                    Set Invalid (Upstream-5) as PERSISTENCE
                                </Button>
                                <Button onClick={() => setDownstream(upstream.value + 10)} size="small">
                                    Set Valid (Upstream+10) as USER
                                </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                                Valid: {downstream.isValidInContext ? "✓" : "✗"} | Source: {downstream._source}
                            </div>
                        </div>
                    </SettingWrapper>
                </div>
            </CollapsibleGroup>

            <CollapsibleGroup title="Precomputed Atom" expanded>
                <SettingWrapper annotations={precomputedAnnotations}>
                    <div className="flex flex-col gap-2">
                        <Label text="Value (doubled must be 10-50)">
                            <Input
                                type="number"
                                value={precomputed.value}
                                onChange={(e) => setPrecomputed(parseFloat(e.target.value) || 0)}
                            />
                        </Label>
                        <div className="flex gap-2">
                            <Button onClick={() => setAsInvalidPersisted(setPrecomputed, 30)} size="small">
                                Set Invalid (30, doubled=60) as PERSISTENCE
                            </Button>
                            <Button onClick={() => setPrecomputed(10)} size="small">
                                Set Valid (10, doubled=20) as USER
                            </Button>
                        </div>
                        <div className="text-xs text-gray-500">
                            Value: {precomputed.value} | Doubled: {precomputed.value * 2} | Valid:{" "}
                            {precomputed.isValidInContext ? "✓" : "✗"} | Source: {precomputed._source}
                        </div>
                    </div>
                </SettingWrapper>
            </CollapsibleGroup>

            <CollapsibleGroup title="Instructions" expanded>
                <div className="text-sm space-y-2">
                    <p>
                        <strong>Quick Test - Use the buttons!</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>
                            Click <strong>"Set Valid as USER"</strong> buttons to set all atoms to valid values with USER
                            source
                        </li>
                        <li>Observe that atoms can be freely edited without warnings</li>
                        <li>
                            Click <strong>"Set Invalid as PERSISTENCE"</strong> button on any atom
                        </li>
                        <li>
                            Observe the <strong>warning annotation</strong> appears (yellow/red indicator)
                        </li>
                        <li>The atom will NOT auto-fix because source is PERSISTENCE</li>
                        <li>Change the value manually or click "Set Valid as USER" to fix it</li>
                    </ol>
                    <p className="mt-4">
                        <strong>To test auto-transition with snapshots:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Set all atoms to valid values using "Set Valid as USER" buttons</li>
                        <li>Create a snapshot</li>
                        <li>Load the snapshot - observe atoms have source: "persistence"</li>
                        <li>After a brief moment, sources auto-transition to "user"</li>
                        <li>Now change Upstream to a large value (e.g., 50)</li>
                        <li>
                            Downstream auto-fixes to Upstream+1 (no warning!) because its source is "user"
                        </li>
                    </ol>
                    <p className="mt-4">
                        <strong>To test invalid persisted state (from snapshot):</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Click "Set Invalid as PERSISTENCE" on one or more atoms</li>
                        <li>Create a snapshot</li>
                        <li>Load the snapshot</li>
                        <li>Invalid atoms show warnings and keep source: "persistence"</li>
                        <li>They will NOT auto-transition to "user" until manually fixed</li>
                    </ol>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
