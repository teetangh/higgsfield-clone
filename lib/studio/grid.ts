export const GRID_COLUMN_MIN = 2;
export const GRID_COLUMN_MAX = 6;

/** Slider left = small thumbnails (more columns), right = large thumbnails (fewer columns). */
export function gridColumnsToSlider(columns: number): number {
  const clamped = Math.min(GRID_COLUMN_MAX, Math.max(GRID_COLUMN_MIN, columns));
  return GRID_COLUMN_MAX + GRID_COLUMN_MIN - clamped;
}

export function sliderToGridColumns(slider: number): number {
  const clamped = Math.min(GRID_COLUMN_MAX, Math.max(GRID_COLUMN_MIN, slider));
  return GRID_COLUMN_MAX + GRID_COLUMN_MIN - clamped;
}
