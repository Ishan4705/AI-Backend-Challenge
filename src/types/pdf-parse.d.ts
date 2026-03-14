// Type declarations for pdf-parse v2
// The @types/pdf-parse package covers v1 and is incompatible with v2
declare module "pdf-parse" {
  interface PDFParseOptions {
    data: Uint8Array | ArrayBuffer;
    verbosity?: number;
  }

  interface TextResult {
    text: string;
    pages: Array<{ text: string; num: number }>;
    total: number;
  }

  export class PDFParse {
    constructor(options: PDFParseOptions);
    getText(options?: Record<string, unknown>): Promise<TextResult>;
    destroy(): Promise<void>;
  }
}
