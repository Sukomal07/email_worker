import { Worker } from 'bullmq';
import sendEMail from './mail.js';
import dotenv from "dotenv"
import axios from 'axios';
import { sendPushNotification } from './sendPushNotification.js';

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

export const quizApiWorker = new Worker('quiz_api_calls', async (job) => {
    const { qaDetails } = job.data;

    try {
        await axios.post(`${process.env.TGBOT_API_URL}/quiz-answer`, qaDetails);
        console.log(`Successfully sent quiz data for ${qaDetails.email} to Telegram API`);
    } catch (error) {
        console.error(`Failed to send quiz data for ${qaDetails.email}:`, error);
        throw error;
    }
}, {
    connection: {
        host: 'localhost',
        port: 6379,
    },
    attempts: 3, // Retry up to 3 times
    backoff: {
        type: 'exponential',
        delay: 2 * 60 * 1000, // Start with 2-minute delay, increasing exponentially
    }
})

export const notificationWorker = new Worker('notification', async (job) => {
    const { expoPushToken, title, body, data } = job.data;
    try {
        await sendPushNotification(expoPushToken, title, body, data)
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
notificationWorker.on('error', (error) => {
    console.error('Redis connection error in notificationWorker:', error);
});

// Listen for when the worker is ready
notificationWorker.on('ready', () => {
    console.log('Notification worker is now ready and connected to Redis.');
});

// Listen for when a job fails
notificationWorker.on('failed', (job, error) => {
    console.error(`Notification job ${job?.id} failed with error:`, error);
});

// Listen for when a job is completed
notificationWorker.on('completed', (job) => {
    console.log(`Notification job ${job.id} completed successfully`);
});

// Listen for Redis connection errors
quizApiWorker.on('error', (error) => {
    console.error('Redis connection error in quizApiWorker:', error);
});

// Listen for when the worker is ready
quizApiWorker.on('ready', () => {
    console.log('Quiz API worker is now ready and connected to Redis.');
});

// Listen for when a job fails
quizApiWorker.on('failed', (job, error) => {
    console.error(`Quiz API job ${job?.id} failed with error:`, error);
});

// Listen for when a job is completed
quizApiWorker.on('completed', (job) => {
    console.log(`Quiz API job ${job.id} completed successfully`);
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

// Listen for when a job is completed
emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed successfully`);
});
