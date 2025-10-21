// api/cron.js
import { MongoClient } from 'mongodb';
import webpush from 'web-push';

// Ensure environment variables are loaded
const MONGO_URI = process.env.MONGO_URI;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!MONGO_URI || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error("Missing required environment variables");
}

webpush.setVapidDetails(
  'mailto:munnachakuli@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('cryptotrack');
  cachedDb = db;
  return db;
}

async function fetchBinancePrices(symbols) {
  if (symbols.length === 0) return {};
  const url = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch prices from Binance');
  const data = await response.json();
  const prices = {};
  for (const item of data) {
    prices[item.symbol] = parseFloat(item.price);
  }
  return prices;
}

async function sendNotification(subscription, payload) {
   try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Subscription expired for ${subscription.endpoint}. Deleting.`);
      const db = await connectToDatabase();
      await db.collection('subscriptions').deleteOne({ endpoint: subscription.endpoint });
    } else {
      console.error('Error sending push notification:', error);
    }
  }
}

const getBaseAsset = (s) => s.replace(/USDT$/, '').toLowerCase();

export default async function handler(req, res) {
  try {
    const db = await connectToDatabase();
    const alertsCollection = db.collection('alerts');
    const subscriptionsCollection = db.collection('subscriptions');
    
    const activeAlerts = await alertsCollection.find({ triggered: false }).toArray();
    if (activeAlerts.length === 0) {
      return res.status(200).json({ message: 'No active alerts to check.' });
    }

    const uniqueSymbols = [...new Set(activeAlerts.map(a => a.symbol))];
    const currentPrices = await fetchBinancePrices(uniqueSymbols);
    
    const triggeredAlertsInfo = [];

    for (const alert of activeAlerts) {
      const currentPrice = currentPrices[alert.symbol];
      if (!currentPrice) continue;

      const conditionMet = 
          (alert.direction === 'Above' && currentPrice >= alert.price) ||
          (alert.direction === 'Below' && currentPrice <= alert.price);

      if (conditionMet) {
        triggeredAlertsInfo.push({
            id: alert.id,
            subscriptionEndpoint: alert.subscriptionEndpoint,
            payload: JSON.stringify({
              title: `${alert.symbol} Price Alert!`,
              body: `Price crossed your target of $${alert.price}. Current price: $${currentPrice.toFixed(2)}`,
              icon: `https://assets.coincap.io/assets/icons/${getBaseAsset(alert.symbol)}@2x.png`,
            })
        });
      }
    }
    
    if (triggeredAlertsInfo.length > 0) {
      const triggeredAlertIds = triggeredAlertsInfo.map(info => info.id);
      
      // Find all subscriptions needed for the triggered alerts
      const subscriptionEndpoints = [...new Set(triggeredAlertsInfo.map(info => info.subscriptionEndpoint))];
      const subscriptions = await subscriptionsCollection.find({ endpoint: { $in: subscriptionEndpoints } }).toArray();
      const subMap = new Map(subscriptions.map(s => [s.endpoint, s]));

      // Send notifications
      for (const info of triggeredAlertsInfo) {
          const subscription = subMap.get(info.subscriptionEndpoint);
          if (subscription) {
              await sendNotification(subscription, info.payload);
          }
      }

      // Mark alerts as triggered in the database to prevent re-sending
      await alertsCollection.updateMany(
        { id: { $in: triggeredAlertIds } },
        { $set: { triggered: true } }
      );
    }
    
    res.status(200).json({ message: `Checked ${activeAlerts.length} alerts. Triggered ${triggeredAlertsInfo.length}.` });

  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ message: 'Cron job execution failed.' });
  }
}