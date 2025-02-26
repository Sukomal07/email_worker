import { Worker } from 'bullmq';
import sendMail from './mail.js';

export const emailWorker = new Worker('emailQueue', async (job) => {
    const { email, subject, emailBody } = job.data;
    try {
        await sendMail(email, subject, emailBody);
        console.log(`Email sent successfully to ${email}`);
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        throw error;
    }
}, {
    connection: {
        host: 'localhost',
        port: 6379,
    }
});

// Listen for Redis connection errors
emailWorker.on('error', (error) => {
    console.error('Redis connection error:', error);
});

// Listen for when the worker is ready
emailWorker.on('ready', () => {
    console.log('Email worker is now ready and connected to Redis.');
});

// Listen for when the worker fails to connect
emailWorker.on('failed', (jobId, error) => {
    console.error(`Job ${jobId} failed with error:`, error);
});
