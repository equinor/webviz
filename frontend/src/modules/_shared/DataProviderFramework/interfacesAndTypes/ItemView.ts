import type { StatusMessage } from "@framework/ModuleInstanceStatusController";

import type { ProviderSnapshot } from "./customDataProviderImplementation";

export interface ItemView {
    getId(): string;
    getName(): string;
    getType(): string;

    isVisible(): boolean;

    getRevisionNumber(): number;
    getStatus(): string;
    getError(): StatusMessage | string | null;

    getChildren?(): ItemView[] | undefined;

    getStateSnapshot(): StateSnapshot | null;
}

export type StateSnapshot<TData = unknown, TMeta extends Record<string, unknown> = Record<string, unknown>> = {
    id: string;
    name: string;
    type: string;
    visible: boolean;

    status: "loading" | "ready" | "error";
    error?: StatusMessage | string | null;
    revision: number;

    snapshot: ProviderSnapshot<TData, TMeta> | null;
};
