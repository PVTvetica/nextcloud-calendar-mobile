import { settleAllOrThrow } from '../../src/utils/settle';

describe('settleAllOrThrow', () => {
  it('returns [] when there are no tasks', async () => {
    await expect(settleAllOrThrow([])).resolves.toEqual([]);
  });

  it('concatenates results when all tasks succeed, preserving order', async () => {
    const result = await settleAllOrThrow<number>([
      () => Promise.resolve([1, 2]),
      () => Promise.resolve([]),
      () => Promise.resolve([3]),
    ]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws when a single task rejects (does not drop the failure)', async () => {
    await expect(
      settleAllOrThrow<number>([
        () => Promise.resolve([1]),
        () => Promise.reject(new Error('network down')),
      ]),
    ).rejects.toThrow('1/2 fetch(es) failed');
  });

  it('throws when every task rejects', async () => {
    await expect(
      settleAllOrThrow<number>([
        () => Promise.reject(new Error('a')),
        () => Promise.reject(new Error('b')),
      ]),
    ).rejects.toThrow('2/2 fetch(es) failed');
  });

  it('attaches the underlying reasons on the thrown error', async () => {
    const boom = new Error('timeout');
    await expect(
      settleAllOrThrow<number>([
        () => Promise.resolve([1]),
        () => Promise.reject(boom),
      ]),
    ).rejects.toMatchObject({ failures: [boom] });
  });
});
