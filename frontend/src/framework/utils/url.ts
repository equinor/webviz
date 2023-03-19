export const makePathname = (paths: string[]) => {
    const elements = paths.map((path) => path.replace(/^\/+/, "").replace(/\/+$/, ""));
    return elements.join("/");
};

export const makeUrl = ({
    hostname,
    port,
    pathname,
    search,
    hash,
    protocol = "http",
}: {
    hostname: string;
    port?: number;
    pathname?: string | string[];
    search?: string;
    hash?: string;
    protocol: "http" | "https";
}): URL => {
    const url = new URL(`${protocol}://${hostname}`);
    if (port) {
        url.port = port.toString();
    }
    if (pathname) {
        url.pathname = makePathname(pathname instanceof Array ? pathname : [pathname]);
    }
    if (search) {
        url.search = search;
    }
    if (hash) {
        url.hash = hash;
    }
    return url;
};

export const urlToString = (url: URL, trailingSlash = false): string => {
    if (trailingSlash) {
        return url.toString();
    }
    return url.toString().replace(/\/$/, "");
};
