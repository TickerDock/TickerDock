import { SecretStorage } from 'vscode';

const AI_API_KEY = 'stock-fund.aiApiKey';

export class SecretRepository {
  constructor(private readonly storage: SecretStorage) {}

  getAiApiKey(): Thenable<string | undefined> { return this.storage.get(AI_API_KEY); }
  setAiApiKey(value: string): Thenable<void> { return this.storage.store(AI_API_KEY, value); }
  deleteAiApiKey(): Thenable<void> { return this.storage.delete(AI_API_KEY); }
}
