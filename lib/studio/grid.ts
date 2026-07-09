export const GRID_COLUMN_MIN = 2;
export const GRID_COLUMN_MAX = 6;

export function clampGridColumns(columns: number): number {
  return Math.min(GRID_COLUMN_MAX, Math.max(GRID_COLUMN_MIN, columns));
}
