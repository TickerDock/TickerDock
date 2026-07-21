import { Disposable, OutputChannel, window } from 'vscode';
import { formatAiOutputEntry } from './aiOutputModel';

export class AiOutputService implements Disposable {
  private readonly output: OutputChannel;

  constructor() {
    this.output = window.createOutputChannel('Stock Fund AI Research');
  }

  record(title: string, result: string): void {
    this.output.appendLine(formatAiOutputEntry(title, result, new Date()));
  }

  show(): void {
    this.output.show(true);
  }

  clear(): void {
    this.output.clear();
  }

  dispose(): void {
    this.output.dispose();
  }
}
