export type LinearProgressProps = {
    variant?: "indeterminate" | "determinate";
    value?: number;
};

const DEFAULT_PROPS = {
    variant: "indeterminate",
} satisfies Partial<LinearProgressProps>;

export function LinearProgress(props: LinearProgressProps) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    if (defaultedProps.variant === "indeterminate") {
        return <IndefiniteLinearProgress />;
    } else {
        return <DeterminateLinearProgress value={defaultedProps.value ?? 0} />;
    }
}

function IndefiniteLinearProgress() {
    return (
        <div
            aria-label="Progress bar"
            role="progressbar"
            className="bg-accent relative h-1 w-full overflow-hidden rounded"
        >
            <div className="bg-accent-strong animate-linear-indefinite absolute top-0 h-full w-3/4" />
        </div>
    );
}

function DeterminateLinearProgress({ value }: { value: number }) {
    return (
        <div
            aria-label="Progress bar"
            role="progressbar"
            className="bg-accent relative h-1 w-full overflow-hidden rounded"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className="bg-accent-strong absolute top-0 h-full"
                style={{ width: `${value}%`, transition: "width 0.2s ease" }}
            />
        </div>
    );
}
