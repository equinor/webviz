// - Infinite query behavior - --- --- --- ---
// To avoid jumpy loads, Page size should at the least be more than the visible amount of rows.
// CosmosDB has a max size of 100 by default
export const QUERY_PAGE_SIZE = 30;
export const NEXT_PAGE_THRESHOLD = 3;

// Helper for rendering pending data
export const PENDING_ROW = Symbol("virtualPendingRow");
export const PENDING_PAGE = new Array<typeof PENDING_ROW>(QUERY_PAGE_SIZE).fill(PENDING_ROW);
