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

const checkReceipts = async (tickets, tokenMap) => {
    const receiptIds = tickets
        .filter(t => t.status === 'ok' && t.id)
        .map(t => t.id);

    if (!receiptIds.length) return;

    // Wait before checking receipts (Expo recommends ~15 min in production)
    await new Promise(res => setTimeout(res, 15 * 60 * 1000));

    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of receiptChunks) {
        try {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

            for (const [receiptId, receipt] of Object.entries(receipts)) {
                if (receipt.status === 'error') {
                    console.error(`Receipt error [${receiptId}]: ${receipt.message}`);

                    if (receipt.details?.error === 'DeviceNotRegistered') {
                        const token = tokenMap[receiptId];
                        if (token) await removeInvalidToken(token);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking receipts:', error);
        }
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

        for (const chunk of chunks) {
            const ticketChunk =
                await expo.sendPushNotificationsAsync(chunk);

            tickets.push(...ticketChunk);
        }

        console.log("Push tickets:", tickets);

        const tokenMap = {};
        tickets.forEach((ticket, index) => {
            if (ticket.status === 'ok' && ticket.id) {
                tokenMap[ticket.id] = validTokens[index];
            } else if (ticket.status === 'error') {
                // Handle immediate errors (e.g. DeviceNotRegistered at ticket stage)
                console.error(`Ticket error for token ${validTokens[index]}:`, ticket.message);
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    removeInvalidToken(validTokens[index]);
                }
            }
        });

        checkReceipts(tickets, tokenMap).catch(err =>
            console.error('Receipt check failed:', err)
        );

        return tickets;
    } catch (error) {
        console.error("Push notification error:", error);
        throw error;
    }
};
