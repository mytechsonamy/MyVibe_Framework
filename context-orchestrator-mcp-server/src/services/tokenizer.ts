import { encoding_for_model, TiktokenModel } from "tiktoken";

export class Tokenizer {
  private encoder: ReturnType<typeof encoding_for_model>;
  private model: TiktokenModel;

  constructor(model: TiktokenModel = "gpt-4") {
    this.model = model;
    this.encoder = encoding_for_model(model);
  }

  countTokens(text: string): number {
    if (!text) return 0;
    return this.encoder.encode(text).length;
  }

  countTokensForFiles(files: Array<{ path: string; content: string }>): Map<string, number> {
    const result = new Map<string, number>();
    for (const file of files) {
      result.set(file.path, this.countTokens(file.content));
    }
    return result;
  }

  truncateToTokens(text: string, maxTokens: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= maxTokens) {
      return text;
    }
    const truncated = tokens.slice(0, maxTokens);
    return new TextDecoder().decode(this.encoder.decode(truncated));
  }

  splitIntoChunks(text: string, maxTokensPerChunk: number, overlapTokens: number = 0): string[] {
    const tokens = this.encoder.encode(text);
    const chunks: string[] = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + maxTokensPerChunk, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      chunks.push(new TextDecoder().decode(this.encoder.decode(chunkTokens)));

      // Move start forward, accounting for overlap
      start = end - overlapTokens;
      if (start >= tokens.length) break;
    }

    return chunks;
  }

  estimateTokensFromChars(charCount: number): number {
    // Rough estimate: ~4 characters per token for code
    return Math.ceil(charCount / 4);
  }

  getMaxContextTokens(): number {
    // Return max context window for the model
    const contextWindows: Record<string, number> = {
      "gpt-4": 8192,
      "gpt-4-32k": 32768,
      "gpt-4-turbo": 128000,
      "gpt-4o": 128000,
      "claude-3-opus": 200000,
      "claude-3-sonnet": 200000,
      "claude-3-haiku": 200000
    };
    return contextWindows[this.model] || 100000;
  }

  free(): void {
    this.encoder.free();
  }
}

// Singleton instance
let tokenizerInstance: Tokenizer | null = null;

export function getTokenizer(model: TiktokenModel = "gpt-4"): Tokenizer {
  if (!tokenizerInstance) {
    tokenizerInstance = new Tokenizer(model);
  }
  return tokenizerInstance;
}

export function countTokens(text: string): number {
  return getTokenizer().countTokens(text);
}
