/**
 * Operasi murni atas meta blok tabel ({ header, rows }) untuk fitur sisip &
 * edit tabel via klik kanan (mode Edit Teks Langsung).
 */

export interface TableMeta {
  header: string[];
  rows: string[][];
}

export type TableOp = 'addRow' | 'addCol' | 'delRow' | 'delCol' | 'delTable';

/** Tabel kosong siap sisip: header + rows berisi string kosong. */
export function makeEmptyTable(rows: number, cols: number): TableMeta {
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  return {
    header: Array.from({ length: safeCols }, () => ''),
    rows: Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => ''))
  };
}

function clone(meta: TableMeta): TableMeta {
  return { header: [...meta.header], rows: meta.rows.map((row) => [...row]) };
}

/**
 * Terapkan operasi tabel. row = -1 berarti baris header. Mengembalikan meta
 * baru (tidak mengubah input); `delTable` ditandai dengan `_delete: true`.
 */
export function applyTableOp(
  meta: TableMeta,
  op: TableOp,
  row: number,
  col: number
): TableMeta & { _delete?: boolean } {
  if (op === 'delTable') return { ...clone(meta), _delete: true };

  const result = clone(meta);

  if (op === 'addRow') {
    // Baris header: baris baru disisipkan paling atas badan tabel.
    const at = row < 0 ? 0 : row + 1;
    result.rows.splice(at, 0, Array.from({ length: result.header.length }, () => ''));
    return result;
  }

  if (op === 'addCol') {
    const at = Math.max(0, Math.min(col + 1, result.header.length));
    result.header.splice(at, 0, '');
    result.rows.forEach((r) => r.splice(at, 0, ''));
    return result;
  }

  if (op === 'delRow') {
    // Header tidak boleh dihapus barisnya; minimal sisakan satu baris.
    if (row < 0 || result.rows.length <= 1) return result;
    result.rows.splice(row, 1);
    return result;
  }

  if (op === 'delCol') {
    // Minimal sisakan satu kolom.
    if (result.header.length <= 1) return result;
    const at = Math.max(0, Math.min(col, result.header.length - 1));
    result.header.splice(at, 1);
    result.rows.forEach((r) => r.splice(at, 1));
    return result;
  }

  return result;
}
