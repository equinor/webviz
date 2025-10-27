import type { BackoffStrategy } from "./BackoffStrategy";

export class FixedBackoffStrategy implements BackoffStrategy {
    private readonly fixedMs: number;

    constructor(fixedMs: number) {
        this.fixedMs = fixedMs;
    }

    nextBackoffMs(): number {
        return Math.max(0, this.fixedMs);
    }
}
