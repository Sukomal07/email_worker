import { Worker } from 'bullmq';
import sendEMail from './mail.js';
import dotenv from "dotenv"
import axios from 'axios';
import { sendPushNotification } from './sendPushNotification.js';
import { getEmailBody } from './helper.js';

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
    try {
        const payload = job.data;
        await sendPushNotification(payload);
        return { success: true };
    } catch (error) {
        throw error;
    }
}, {
    connection: {
        host: 'localhost',
        port: 6379,
    }
});

export const telegramWorker = new Worker('joiningLinkQueue', async (job) => {
    const { name, email, phone_number, planId, templateHtml, subject, startDate, endDate } = job.data;

    console.log(`[TelegramWorker] Processing job for ${email}`);

    // Step 1: Fetch Telegram join link
    let groupLink = '';
    try {
        const response = await axios.post(`${process.env.TGBOT_API_URL}/join-link`, {
            name,
            email,
            phone_number,
            planId,
        });

        groupLink = response.data?.data?.link || '';
        console.log(`[TelegramWorker] Got group link for ${email}: ${groupLink}`);
    } catch (error) {
        console.error(`[TelegramWorker] Failed to fetch join link:`, error.message);
        throw error; // Let BullMQ retry
    }

    // Step 2: Prepare email body and send
    try {
        const emailBody = getEmailBody(templateHtml, {
            subscriber_name: name ?? 'User',
            start_date: startDate,
            end_date: endDate,
            group_link: groupLink,
        });

        await sendEMail(email, subject, emailBody);
        console.log(`[TelegramWorker] Email sent to ${email}`);
    } catch (error) {
        console.error(`[TelegramWorker] Failed to send email to ${email}:`, error.message);
        throw error;
    }
},
    {
        connection: {
            host: 'localhost',
            port: 6379,
        },
    }
);

export const meetingDetailsWorker = new Worker(
    'meetingDetailsQueue',
    async (job) => {
        const { user, mentor, meeting_date, start_time, end_time, location_name } = job.data;

        console.log(`[MeetingDetailsWorker] Processing to send meeting details for ${user.email}`);

        try {
            const response = await axios.post(`${process.env.TGBOT_API_URL}/meeting-details`, {
                user,
                mentor,
                meeting_date,
                start_time,
                end_time,
                location_name
            });
            console.log(`[MeetingDetailsWorker] Telegram API response:`, response.data?.data?.msg);
            console.log(`[MeetingDetailsWorker] Meeting details sent to ${user.email}`);
        } catch (error) {
            console.error(`[MeetingDetailsWorker] Failed to send meeting details for ${user.email}:`, error.message);
            throw error;
        }
    },
    {
        connection: {
            host: 'localhost',
            port: 6379,
        },
    }
);

// Listen for when the worker is ready
meetingDetailsWorker.on('ready', () => {
    console.log('Meeting Details worker is now ready and connected to Redis.');
});

// Listen for Redis connection errors
meetingDetailsWorker.on('error', (error) => {
    console.error('Redis connection error in meetingDetailsWorker:', error.message);
});

// Listen for when a job fails
meetingDetailsWorker.on('failed', (job, error) => {
    console.error(`Meeting Details job ${job?.id} failed with error:`, error.message);
});


//Listen for Redis connection errors
telegramWorker.on('error', (error) => {
    console.error('Redis connection error in telegramWorker:', error.message);
});

// Listen for when the worker is ready
telegramWorker.on('ready', () => {
    console.log('Telegram worker is now ready and connected to Redis.');
});

// Listen for when a job fails
telegramWorker.on('failed', (job, error) => {
    console.error(`Telegram job ${job?.id} failed with error:`, error.message);
});

// Listen for Redis connection errors
notificationWorker.on('error', (error) => {
    console.error('Redis connection error in notificationWorker:', error.message);
});

// Listen for when the worker is ready
notificationWorker.on('ready', () => {
    console.log('Notification worker is now ready and connected to Redis.');
});

// Listen for when a job fails
notificationWorker.on('failed', (job, error) => {
    console.error(`Notification job ${job?.id} failed with error:`, error.message);
});

// Listen for when a job is completed
notificationWorker.on('completed', (job) => {
    console.log(`Notification job ${job.id} completed successfully`);
});

// Listen for Redis connection errors
quizApiWorker.on('error', (error) => {
    console.error('Redis connection error in quizApiWorker:', error.message);
});

// Listen for when the worker is ready
quizApiWorker.on('ready', () => {
    console.log('Quiz API worker is now ready and connected to Redis.');
});

// Listen for when a job fails
quizApiWorker.on('failed', (job, error) => {
    console.error(`Quiz API job ${job?.id} failed with error:`, error.message);
});

// Listen for when a job is completed
quizApiWorker.on('completed', (job) => {
    console.log(`Quiz API job ${job.id} completed successfully`);
});

// Listen for Redis connection errors
emailWorker.on('error', (error) => {
    console.error('Redis connection error:', error.message);
});

// Listen for when the worker is ready
emailWorker.on('ready', () => {
    console.log('Email worker is now ready and connected to Redis.');
});

// Listen for when the worker fails to connect
emailWorker.on('failed', (jobId, error) => {
    console.error(`Job ${jobId} failed with error:`, error.message);
});

// Listen for when a job is completed
emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed successfully`);
});
