import {
    getHighlightGroupKey,
    getRealizationId,
    getStatisticKey,
    isFanchartSeries,
    isRealizationSeries,
} from "./seriesId";

export type SeriesRole = "member" | "summary" | "band" | "reference" | "measurement" | (string & {});

export type SeriesMetadata = {
    family: string;
    chart: string;
    axisIndex: number;
    roles: SeriesRole[];
    linkGroupKey?: string;
    memberKey?: string;
    statKey?: string;
};

export type SeriesMetadataCarrier = {
    webvizSeriesMeta?: SeriesMetadata;
};

type SeriesIdentityLike = SeriesMetadataCarrier & {
    id?: unknown;
    seriesId?: unknown;
};

export function withSeriesMetadata<T extends object>(series: T, metadata: SeriesMetadata): T & SeriesMetadataCarrier {
    return {
        ...series,
        webvizSeriesMeta: metadata,
    };
}

export function readSeriesMetadata(value: unknown): SeriesMetadata | null {
    if (!value || typeof value !== "object") return null;

    const metadata = (value as SeriesMetadataCarrier).webvizSeriesMeta;
    return isSeriesMetadata(metadata) ? metadata : null;
}

export function getSeriesIdentifier(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return null;

    const candidate = value as SeriesIdentityLike;
    if (typeof candidate.seriesId === "string") return candidate.seriesId;
    if (typeof candidate.id === "string") return candidate.id;

    return null;
}

export function getSeriesAxisIndex(value: unknown): number | null {
    const metadata = readSeriesMetadata(value);
    return metadata ? metadata.axisIndex : null;
}

export function getSeriesFamily(value: unknown): string | null {
    const metadata = readSeriesMetadata(value);
    return metadata?.family ?? null;
}

export function getSeriesChart(value: unknown): string | null {
    const metadata = readSeriesMetadata(value);
    return metadata?.chart ?? null;
}

export function hasSeriesRole(value: unknown, role: SeriesRole): boolean {
    const metadata = readSeriesMetadata(value);
    return metadata ? metadata.roles.includes(role) : false;
}

export function isMemberSeries(value: unknown): boolean {
    const metadata = readSeriesMetadata(value);
    if (metadata) return metadata.roles.includes("member");

    const seriesId = getSeriesIdentifier(value);
    return seriesId ? isRealizationSeries(seriesId) : false;
}

export function isBandSeries(value: unknown): boolean {
    const metadata = readSeriesMetadata(value);
    if (metadata) return metadata.roles.includes("band");

    const seriesId = getSeriesIdentifier(value);
    return seriesId ? isFanchartSeries(seriesId) : false;
}

export function getSeriesLinkGroupKey(value: unknown): string | null {
    const metadata = readSeriesMetadata(value);
    if (metadata?.linkGroupKey) return metadata.linkGroupKey;

    const seriesId = getSeriesIdentifier(value);
    return seriesId ? getHighlightGroupKey(seriesId) : null;
}

export function getSeriesMemberKey(value: unknown): string | null {
    const metadata = readSeriesMetadata(value);
    if (metadata?.memberKey) return metadata.memberKey;

    const seriesId = getSeriesIdentifier(value);
    return seriesId ? getRealizationId(seriesId) : null;
}

export function getSeriesStatKey(value: unknown): string | null {
    const metadata = readSeriesMetadata(value);
    if (metadata?.statKey) return metadata.statKey;

    const seriesId = getSeriesIdentifier(value);
    return seriesId ? getStatisticKey(seriesId) : null;
}

function isSeriesMetadata(value: unknown): value is SeriesMetadata {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<SeriesMetadata>;
    return (
        typeof candidate.family === "string" &&
        typeof candidate.chart === "string" &&
        typeof candidate.axisIndex === "number" &&
        Number.isFinite(candidate.axisIndex) &&
        Array.isArray(candidate.roles) &&
        candidate.roles.every((role) => typeof role === "string")
    );
}