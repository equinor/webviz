type DataShape = Record<string, unknown> & {
    path?: unknown;
    query?: unknown;
};

export type ExtractParametersAndAllowNulls<TData extends DataShape> = (TData["path"] extends Record<string, unknown>
    ? {
          path: {
              [K in keyof TData["path"]]: undefined extends TData["path"][K]
                  ? TData["path"][K] | undefined
                  : TData["path"][K] | null;
          };
      }
    : // eslint-disable-next-line @typescript-eslint/ban-types
      {}) &
    (TData["query"] extends Record<string, unknown>
        ? {
              query: {
                  [K in keyof TData["query"]]: undefined extends TData["query"][K]
                      ? TData["query"][K] | undefined
                      : TData["query"][K] | null;
              };
          }
        : // eslint-disable-next-line @typescript-eslint/ban-types
          {});
