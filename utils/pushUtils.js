const { Expo } = require('expo-server-sdk');
const expo = new Expo();

exports.sendPushNotification = async (pushToken, message) => {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      return;
    }

    const ticketChunk = await expo.sendPushNotificationsAsync([{
      to: pushToken,
      sound: 'default',
      ...message,
    }]);
    console.log('Push sent:', ticketChunk);
  } catch (error) {
    console.error('Push error:', error);
  }
};
