import { describe, expect, it } from 'vitest';
import { getLeekCenterPage, LEEK_CENTER_PAGES, LEEK_CENTER_TABS } from '../src/leekCenterPages';

describe('Leek Center page definitions', () => {
  it('keeps unique IDs and HTTPS allowlisted destinations', () => {
    expect(new Set(LEEK_CENTER_PAGES.map(({ id }) => id)).size).toBe(LEEK_CENTER_PAGES.length);
    for (const page of LEEK_CENTER_PAGES) expect(new URL(page.url).protocol).toBe('https:');
    expect(getLeekCenterPage('dragon-tiger')?.title).toBe('龙虎榜');
  });
  it('exposes the React tab model', () => {
    expect(LEEK_CENTER_TABS.map(({ id }) => id)).toEqual(['data-center', 'watchlist']);
  });
});


