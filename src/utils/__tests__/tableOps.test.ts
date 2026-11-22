import { describe, it, expect } from 'vitest';
import { makeEmptyTable, applyTableOp } from '../tableOps';

describe('makeEmptyTable', () => {
  it('membuat header + rows kosong sesuai ukuran', () => {
    const meta = makeEmptyTable(2, 3);
    expect(meta.header).toEqual(['', '', '']);
    expect(meta.rows).toEqual([['', '', ''], ['', '', '']]);
  });
});

describe('applyTableOp', () => {
  const base = {
    header: ['Tahap', 'Volume'],
    rows: [
      ['Pelatihan', '700 liter'],
      ['Inferensi', '0,5 liter']
    ]
  };

  it('tambah baris di bawah baris yang diklik', () => {
    const meta = applyTableOp(base, 'addRow', 0, 0);
    expect(meta.rows).toEqual([
      ['Pelatihan', '700 liter'],
      ['', ''],
      ['Inferensi', '0,5 liter']
    ]);
    expect(meta.header).toEqual(base.header);
  });

  it('tambah kolom di kanan sel yang diklik mengisi header & semua baris', () => {
    const meta = applyTableOp(base, 'addCol', 0, 0);
    expect(meta.header).toEqual(['Tahap', '', 'Volume']);
    expect(meta.rows.every((row) => row.length === 3)).toBe(true);
    expect(meta.rows[0][1]).toBe('');
    const afterLast = applyTableOp(base, 'addCol', 1, 1);
    expect(afterLast.header).toEqual(['Tahap', 'Volume', '']);
  });

  it('hapus baris badan menghapus baris yang diklik', () => {
    const meta = applyTableOp(base, 'delRow', 0, 0);
    expect(meta.rows).toEqual([['Inferensi', '0,5 liter']]);
  });

  it('hapus kolom menghapus kolom yang diklik di header & baris', () => {
    const meta = applyTableOp(base, 'delCol', 0, 1);
    expect(meta.header).toEqual(['Tahap']);
    expect(meta.rows).toEqual([['Pelatihan'], ['Inferensi']]);
  });

  it('kolom terakhir tidak boleh dihapus', () => {
    const single = { header: ['A'], rows: [['x']] };
    const meta = applyTableOp(single, 'delCol', 0, 0);
    expect(meta).toEqual(single);
  });

  it('baris terakhir tidak boleh dihapus', () => {
    const single = { header: ['A'], rows: [['x']] };
    const meta = applyTableOp(single, 'delRow', 0, 0);
    expect(meta).toEqual(single);
  });

  it('header tidak bisa dihapus barisnya', () => {
    const meta = applyTableOp(base, 'delRow', -1, 0);
    expect(meta).toEqual(base);
  });

  it('hapus tabel ditandai via op delTable', () => {
    expect(applyTableOp(base, 'delTable', 0, 0)._delete).toBe(true);
  });
});
