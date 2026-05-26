import { describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({
  useMemo: (factory) => factory()
}));

import useLibraryIndex from './useLibraryIndex';

describe('useLibraryIndex', () => {
  it('builds a case-insensitive wordByText map', () => {
    const folders = [];
    const vocabData = [
      { id: '1', word: 'Apple', folderIds: [] },
      { id: '2', word: 'banana', folderIds: [] }
    ];
    
    const result = useLibraryIndex({ folders, vocabData });
    
    expect(result.wordByText.get('apple')).toEqual({ id: '1', word: 'Apple', folderIds: [] });
    expect(result.wordByText.get('banana')).toEqual({ id: '2', word: 'banana', folderIds: [] });
    expect(result.wordByText.get('Apple')).toBeUndefined();
  });
});
