import { Disposable, OutputChannel, window } from 'vscode';
import { formatAiOutputEntry } from './aiOutputModel';

export class AiOutputService implements Disposable {
  private output: OutputChannel | undefined;

  record(title: string, result: string): void {
    this.getOutput().appendLine(formatAiOutputEntry(title, result, new Date()));
  }

  show(): void {
    this.getOutput().show(true);
  }

  clear(): void {
    this.output?.clear();
  }

  dispose(): void {
    this.output?.dispose();
    this.output = undefined;
  }

  private getOutput(): OutputChannel {
    this.output ??= window.createOutputChannel('TickerDock AI Research');
    return this.output;
  }
}
