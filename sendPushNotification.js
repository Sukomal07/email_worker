import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (
    expoPushToken,
    title,
    body,
    data = {}
) => {
    if (!Expo.isExpoPushToken(expoPushToken)) {
        console.error(`Invalid Expo Push Token: ${expoPushToken}`);
        return;
    }

    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
    };

    try {
        const receipt = await expo.sendPushNotificationsAsync([message]);
        console.log('Push notification receipt:', receipt);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};
