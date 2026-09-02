export interface PublisherProvider {
  readonly kind: string;
  isConfigured(): boolean;
  publishVideo(input: {
    filePath: string;
    caption: string;
    title?: string;
    pageId?: string;
  }): Promise<{ platformPostId: string; url?: string }>;
  scheduleVideo(input: {
    filePath: string;
    caption: string;
    title?: string;
    pageId?: string;
    scheduledUnix: number;
  }): Promise<{ platformPostId: string; url?: string; scheduledUnix: number }>;
  getStatus(opts: { pageId: string; postId: string }): Promise<{ status: string }>;
}
