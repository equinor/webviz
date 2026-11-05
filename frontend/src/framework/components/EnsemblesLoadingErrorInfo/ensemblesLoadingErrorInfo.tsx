import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";

export type EnsemblesLoadingErrorInfoProps = {
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
};

// Excludes trailing punctuation so a sentence-ending period is not part of the link
const URL_REGEX = /https?:\/\/[^\s]*[^\s.,;:!?)]/g;

// Backend messages may echo request/Sumo values, so only linkify known documentation hosts
const TRUSTED_LINK_HOSTS = new Set(["ert.readthedocs.io"]);

function isTrustedLink(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === "https:" && TRUSTED_LINK_HOSTS.has(parsedUrl.hostname);
    } catch {
        return false;
    }
}

function TextWithLinks(props: { text: string }): React.ReactNode {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    for (const match of props.text.matchAll(URL_REGEX)) {
        if (!isTrustedLink(match[0])) {
            continue;
        }
        nodes.push(props.text.slice(lastIndex, match.index));
        nodes.push(
            <a key={match.index} className="inline-anchor" href={match[0]} target="_blank" rel="noopener noreferrer">
                {match[0]}
            </a>,
        );
        lastIndex = match.index + match[0].length;
    }
    nodes.push(props.text.slice(lastIndex));
    return nodes;
}

export function EnsemblesLoadingErrorInfo(props: EnsemblesLoadingErrorInfoProps): React.ReactNode {
    return (
        <div className="gap-y-xs flex max-h-96 flex-col overflow-y-auto">
            {Object.entries(props.ensembleLoadingErrorInfoMap).map(([ensembleIdentString, errorInfo]) => {
                const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                return (
                    <div key={ensembleIdentString}>
                        <div className="font-bolder">
                            {descriptionPrefix}: {errorInfo.displayName}
                        </div>
                        <ul className="list-inside list-disc">
                            <li>{errorInfo.errorMessage}</li>
                        </ul>
                        {errorInfo.details && (
                            <div className="text-neutral-subtle mt-2xs ml-md whitespace-pre-line">
                                <TextWithLinks text={errorInfo.details} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
