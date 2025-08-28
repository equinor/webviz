// - Infinite query behavior - --- --- --- ---
// To avoid jumpy loads, Page size should at the least be more than the visible amount of rows.
// CosmosDB has a max size of 100 by default
export const QUERY_PAGE_SIZE = 30;
export const NEXT_PAGE_THRESHOLD = 3;

// - Table styling config ---- --- --- --- ---
// Table style config
export const USE_ALTERNATING_COLUMN_COLORS = false;
export const ROW_HEIGHT = 46;
export const HEADER_HEIGHT = 50;
export const TABLE_HEIGHT = ROW_HEIGHT * 10;
