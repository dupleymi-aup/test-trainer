/**
 * Ambient type declarations for optional third-party modules.
 * These modules are dynamically imported only when needed (e.g., PDF export, SMS).
 * Installing them is optional, so we provide minimal type stubs here.
 */

declare module "jspdf" {
  export class jsPDF {
    constructor(options?: { orientation?: string; unit?: string; format?: string });
    text(text: string, x: number, y: number, options?: { align?: string; maxWidth?: number }): void;
    setFontSize(size: number): void;
    setFont(fontName: string, fontStyle?: string): void;
    setTextColor(color: number): void;
    setLineWidth(width: number): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    addPage(): void;
    save(filename: string): void;
    output(type: string): ArrayBuffer;
    internal: {
      pageSize: { getWidth: () => number; getHeight: () => number };
    };
  }
}

declare module "twilio" {
  interface TwilioClient {
    messages: {
      create(params: {
        body: string;
        to: string;
        from: string;
      }): Promise<{ sid: string }>;
    };
  }

  interface Twilio {
    (accountSid: string, authToken: string): TwilioClient;
  }

  const twilio: Twilio;
  export default twilio;
}