import { SecretStorage } from 'vscode';

const AI_API_KEY = 'tickerdock.aiApiKey';
const BETA_AI_API_KEY = 'stock-fund.aiApiKey';

export class SecretRepository {
  constructor(private readonly storage: SecretStorage) {}

  async getAiApiKey(): Promise<string | undefined> {
    const current = await this.storage.get(AI_API_KEY);
    if (current !== undefined) return current;
    const beta = await this.storage.get(BETA_AI_API_KEY);
    if (beta !== undefined) await this.storage.store(AI_API_KEY, beta);
    return beta;
  }
  setAiApiKey(value: string): Thenable<void> { return this.storage.store(AI_API_KEY, value); }
  async deleteAiApiKey(): Promise<void> {
    await Promise.all([this.storage.delete(AI_API_KEY), this.storage.delete(BETA_AI_API_KEY)]);
  }
}
