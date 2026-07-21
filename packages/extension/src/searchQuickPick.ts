import { SearchResult } from '@stock-fund/domain';
import { QuickPickItem, window } from 'vscode';

interface SearchItem extends QuickPickItem {
  result?: SearchResult;
}

export function pickSearchResult(
  title: string,
  placeHolder: string,
  search: (keyword: string) => Promise<SearchResult[]>
): Promise<SearchResult | undefined> {
  const picker = window.createQuickPick<SearchItem>();
  picker.title = title;
  picker.placeholder = placeHolder;
  picker.ignoreFocusOut = true;
  picker.matchOnDescription = true;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestVersion = 0;
  let finished = false;

  return new Promise((resolve) => {
    const finish = (result?: SearchResult) => {
      if (finished) return;
      finished = true;
      if (timer) clearTimeout(timer);
      resolve(result);
      picker.dispose();
    };

    picker.onDidChangeValue((value) => {
      const keyword = value.trim();
      const version = ++requestVersion;
      if (timer) clearTimeout(timer);
      if (!keyword) {
        picker.busy = false;
        picker.items = [];
        return;
      }
      picker.busy = true;
      timer = setTimeout(async () => {
        try {
          const results = await search(keyword);
          if (finished || version !== requestVersion) return;
          picker.items = results.map((result) => ({
            label: result.name,
            description: result.code,
            result,
          }));
        } catch (error) {
          if (finished || version !== requestVersion) return;
          picker.items = [{
            label: 'Search failed',
            description: error instanceof Error ? error.message : String(error),
          }];
        } finally {
          if (!finished && version === requestVersion) picker.busy = false;
        }
      }, 250);
    });
    picker.onDidAccept(() => {
      const selected = picker.selectedItems[0] ?? picker.activeItems[0];
      if (selected?.result) {
        finish(selected.result);
      }
    });
    picker.onDidHide(() => finish());
    picker.show();
  });
}
