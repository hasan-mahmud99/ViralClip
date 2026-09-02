import { Queue, Worker } from "bullmq";

export const QUEUE_NAMES = [
  "source-discovery",
  "source-analysis",
  "transcription",
  "moment-analysis",
  "script-generation",
  "script-critique",
  "tts",
  "render",
  "qa",
  "publishing",
  "analytics",
  "daily-orchestration",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export interface JobData {
  jobId?: string;
  reelId?: string;
  sourceId?: string;
  momentId?: string;
  scriptId?: string;
  renderId?: string;
  retryCount?: number;
}

export interface JobContext {
  queue: JobQueue;
  log: (msg: string, data?: Record<string, unknown>) => void;
}

export type JobHandler = (data: JobData, ctx: JobContext) => Promise<void>;

export interface JobQueue {
  enqueue(name: QueueName, data: JobData): Promise<void>;
  process(handlers: Record<QueueName, JobHandler>, opts?: { concurrency?: Partial<Record<QueueName, number>> }): Promise<() => Promise<void>>;
  close(): Promise<void>;
}

export class BullQueue implements JobQueue {
  private queues = new Map<QueueName, Queue>();
  private workers: Worker[] = [];
  private redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    for (const name of QUEUE_NAMES) {
      this.queues.set(name, new Queue(name, { connection: { url: this.redisUrl } }));
    }
  }

  async enqueue(name: QueueName, data: JobData): Promise<void> {
    await this.queues.get(name)!.add(name, data, {
      jobId: data.jobId ?? undefined,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async process(handlers: Record<QueueName, JobHandler>): Promise<() => Promise<void>> {
    for (const name of QUEUE_NAMES) {
      const worker = new Worker(name, async (job) => {
        const data = job.data as JobData;
        const handler = handlers[name];
        if (!handler) {
          throw new Error(`no handler for ${name}`);
        }
        await handler(data, {
          queue: this,
          log: (msg, extra) => {
            console.log(JSON.stringify({ stage: name, job: job.id, ...extra, msg }));
          },
        });
      }, { connection: { url: this.redisUrl } });
      this.workers.push(worker);
    }
    return async () => {
      await Promise.all(this.workers.map((w) => w.close()));
    };
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}

export { Queue, Worker };
