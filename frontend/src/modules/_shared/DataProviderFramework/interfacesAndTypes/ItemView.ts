import { StatusMessage } from "@framework/ModuleInstanceStatusController";

export interface ItemView {
    getId(): string;
    getName(): string;
    getType(): string;

    isVisible(): boolean;

    getChildren?(): ItemView[] | undefined;

    getStateSnapshot?(): StateSnapshot | null;
}

export type StateSnapshot<TData = unknown, TMeta extends Record<string, unknown> = Record<string, unknown>> = {
    status: "loading" | "ready" | "error";
    error?: StatusMessage | string | null;

    meta?: TMeta;

    revision: number;

    data: TData;
    dataValueRange?: readonly [number, number] | null;
    dataLabel?: string;
};
