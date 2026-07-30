import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailService, SendMailOptions } from '../../mail/mail.service';
import { QUEUE_EMAIL } from '../queue.constants';

export const EMAIL_JOB_SEND = 'send';

/**
 * First BullMQ processor in the app — added alongside the Auth module, which is the first
 * producer of `email` jobs (verification/reset/OTP emails), per docs/17-BULLMQ-DESIGN.md §6.
 * Retry/backoff policy is set per-job at enqueue time (see auth.service.ts).
 */
@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<SendMailOptions>): Promise<void> {
    if (job.name !== EMAIL_JOB_SEND) {
      this.logger.warn(`Unknown email job name: ${job.name}`);
      return;
    }
    await this.mailService.sendMail(job.data);
  }
}
