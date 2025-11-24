import { useAtomValue } from "jotai";

import {
    downstreamAtom,
    precomputedAtom,
    simpleNumberAtom,
    upstreamAtom,
} from "./settings/atoms/persistableFixableAtoms";

export function View() {
    const simpleNumber = useAtomValue(simpleNumberAtom);
    const upstream = useAtomValue(upstreamAtom);
    const downstream = useAtomValue(downstreamAtom);
    const precomputed = useAtomValue(precomputedAtom);

    return (
        <div className="flex flex-col gap-4 p-8">
            <h2 className="text-2xl font-bold">Persistable Atom Test - Live State</h2>

            <div className="text-sm text-gray-600">
                This view shows the real-time state of all persistable atoms. Watch how the source changes from
                `&quot;persistence`&quot; to `&quot;user`&quot; automatically when atoms become valid.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AtomCard
                    title="Simple Number Atom"
                    value={simpleNumber.value}
                    source={simpleNumber._source}
                    isValid={simpleNumber.isValidInContext}
                    isLoading={simpleNumber.isLoading}
                    depsHaveError={simpleNumber.depsHaveError}
                    validationRule="Must be between 1 and 100"
                />

                <AtomCard
                    title="Upstream Atom"
                    value={upstream.value}
                    source={upstream._source}
                    isValid={upstream.isValidInContext}
                    isLoading={upstream.isLoading}
                    depsHaveError={upstream.depsHaveError}
                    validationRule="Must be positive"
                />

                <AtomCard
                    title="Downstream Atom"
                    value={downstream.value}
                    source={downstream._source}
                    isValid={downstream.isValidInContext}
                    isLoading={downstream.isLoading}
                    depsHaveError={downstream.depsHaveError}
                    validationRule={`Must be > Upstream (${upstream.value})`}
                    dependency="Depends on Upstream Atom"
                />

                <AtomCard
                    title="Precomputed Atom"
                    value={precomputed.value}
                    source={precomputed._source}
                    isValid={precomputed.isValidInContext}
                    isLoading={precomputed.isLoading}
                    depsHaveError={precomputed.depsHaveError}
                    validationRule={`Doubled value (${precomputed.value * 2}) must be 10-50`}
                />
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
                <h3 className="font-bold mb-2">Expected Behavior:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>When you load a snapshot with valid values, atoms start with source &quot;persistence&quot;</li>
                    <li>
                        After a brief moment (microtask), valid atoms automatically transition to source
                        &quot;user&quot;
                    </li>
                    <li>
                        Once transitioned to &quot;user&quot;, atoms will auto-fix if they become invalid due to
                        dependency changes
                    </li>
                    <li>
                        Invalid persisted atoms remain with source &quot;persistence&quot; and show warnings until
                        manually fixed
                    </li>
                </ul>
            </div>
        </div>
    );
}

function AtomCard({
    title,
    value,
    source,
    isValid,
    isLoading,
    depsHaveError,
    validationRule,
    dependency,
}: {
    title: string;
    value: number;
    source: string;
    isValid: boolean;
    isLoading: boolean;
    depsHaveError: boolean;
    validationRule: string;
    dependency?: string;
}) {
    const statusColor = isValid ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300";
    const sourceColor =
        source === "user"
            ? "bg-blue-100 text-blue-800"
            : source === "persistence"
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-800";

    return (
        <div className={`p-4 rounded-lg border-2 ${statusColor}`}>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="font-semibold">Value:</span>
                    <span className="font-mono">{value}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Source:</span>
                    <span className={`px-2 py-1 rounded text-xs font-mono ${sourceColor}`}>{source}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-semibold">Valid:</span>
                    <span className={`text-lg ${isValid ? "text-green-600" : "text-red-600"}`}>
                        {isValid ? "✓" : "✗"}
                    </span>
                </div>
                {isLoading && (
                    <div className="flex justify-between">
                        <span className="font-semibold">Status:</span>
                        <span className="text-blue-600">Loading...</span>
                    </div>
                )}
                {depsHaveError && (
                    <div className="flex justify-between">
                        <span className="font-semibold">Status:</span>
                        <span className="text-red-600">Dependency Error</span>
                    </div>
                )}
                <div className="pt-2 border-t border-gray-300">
                    <div className="text-xs text-gray-600">{validationRule}</div>
                    {dependency && <div className="text-xs text-gray-500 italic mt-1">{dependency}</div>}
                </div>
            </div>
        </div>
    );
}
