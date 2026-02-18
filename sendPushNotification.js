import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Send Expo push notification
 *
 * Payload structure:
 * {
 *   tokens: string | string[],
 *   title: string,
 *   body: string,
 *   data?: object,
 *   ttl?: number,
 *   priority?: "default" | "normal" | "high",
 *   richContent?: {
 *     image?: string
 *   }
 * }
 */

export const sendPushNotification = async (payload) => {
    try {
        const {
            tokens,
            title,
            body,
            data,
            ttl,
            priority,
            richContent,
        } = payload;

        if (!tokens || !title || !body) {
            throw new Error("tokens, title and body are required");
        }

        const pushTokens = Array.isArray(tokens)
            ? tokens
            : [tokens];

        // Validate tokens
        const validTokens = pushTokens.filter(token => {
            if (!Expo.isExpoPushToken(token)) {
                console.warn(`Invalid Expo Push Token: ${token}`);
                return false;
            }
            return true;
        });

        if (!validTokens.length) {
            console.warn("No valid push tokens found");
            return;
        }

        // Build messages ONLY from payload fields
        const messages = validTokens.map(token => ({
            to: token,
            title,
            body,
            data,
            ttl,
            priority,
            richContent,
        }));

        const chunks = expo.chunkPushNotifications(messages);

        const tickets = [];

        for (const chunk of chunks) {
            const ticketChunk =
                await expo.sendPushNotificationsAsync(chunk);

            tickets.push(...ticketChunk);
        }

        console.log("Push tickets:", tickets);

        return tickets;
    } catch (error) {
        console.error("Push notification error:", error);
        throw error;
    }
};
