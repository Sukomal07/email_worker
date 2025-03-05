import { Worker } from 'bullmq';
import sendEMail from './mail.js';
import dotenv from "dotenv"

dotenv.config()

export const emailWorker = new Worker('emailQueue', async (job) => {
    const { email, subject, emailBody } = job.data;
    try {
        await sendEMail(email, subject, emailBody);
    } catch (error) {
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
