export type BackoffContext = {
    // increments when no new progress arrives
    attempt: number;
    // initial delay before the next poll
    baseDelayMs: number;
    // max delay for backoff caps
    maxDelayMs: number;
    // true if progress message changed since last poll
    progressChanged: boolean;
};

export interface BackoffStrategy {
    nextBackoffMs(ctx: BackoffContext): number;
}
