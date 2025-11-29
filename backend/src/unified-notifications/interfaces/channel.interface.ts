export interface RenderedContent {
  subject?: string;
  body: string;
  format: 'text' | 'html' | 'markdown';
}

export interface ChannelResult {
  success: boolean;
  externalId?: string;
  error?: string;
  retryable?: boolean;
}

export interface RateLimitConfig {
  maxPerSecond: number;
  maxPerHour: number | null;
  maxPerDay: number | null;
}

export interface INotificationChannel {
  readonly name: string;

  send(
    recipientAddress: string,
    content: RenderedContent,
    metadata?: Record<string, any>,
  ): Promise<ChannelResult>;

  validateAddress(address: string): boolean;

  getRateLimitConfig(): RateLimitConfig;
}
