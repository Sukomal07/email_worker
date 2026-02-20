import { Expo } from 'expo-server-sdk';

const expo = new Expo();

const removeInvalidToken = async (token) => {
    try {
        const baseUrl = process.env.BACKEND_API_URL;
        await fetch(`${baseUrl}/user/update/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        console.log(`Removed invalid token: ${token}`);
    } catch (error) {
        console.error(`Failed to remove token ${token}:`, error);
    }
};

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

        let tokenIndex = 0;

        for (const chunk of chunks) {
            const ticketChunk =
                await expo.sendPushNotificationsAsync(chunk);

            ticketChunk.forEach((ticket, index) => {
                const token = validTokens[tokenIndex + index];

                if (ticket.status === 'error') {
                    console.error(`Push error for token ${token}:`, ticket.message);

                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        removeInvalidToken(token);
                    }
                }
            });

            tokenIndex += chunk.length;

            tickets.push(...ticketChunk);
        }

        console.log("Push tickets:", tickets);

        return tickets;
    } catch (error) {
        console.error("Push notification error:", error);
        throw error;
    }
};
