// --- CrypTrack Server (Demonstration) ---
// This is a conceptual server script to illustrate how the backend for your
// MERN stack application would function. It is NOT a runnable file in this environment.

// To run this locally, you would need Node.js and MongoDB installed.
// 1. Run `npm install` in this directory.
// 2. Generate VAPID keys (see web-push docs).
// 3. Set up a MongoDB database.
// 4. Fill in the placeholders below.
// 5. Run `node server.js`.

import express from 'express';
import WebSocket from 'ws';
import webpush from 'web-push';
import { MongoClient } from 'mongodb';

// --- CONFIGURATION ---
const PORT = 3001;
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m'; // 1-minute klines
const MONGO_URI = 'mongodb+srv://siddhantgavand74_db_user:m96C8pHlqHZ8hQOT@cluster0.i7olwsw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'cryptotrack';

// --- VAPID Keys for Web Push ---
// These should be generated once and stored securely.
// The public key is shared with the frontend.
const VAPID_PUBLIC_KEY = 'BKRf4BqTxG-d2nKxkx0ifzzijnc9E435uHiKZYqdi3r2Yo0MYczkyMV8cfIRPoOUqtyW1ahMQ7s1CZnKE_CNRz0'; // Replace with your key
const VAPID_PRIVATE_KEY = 'MmUE8zukXXnAHT5J0Y7TZVlpflpj3hwkVcjPIQBBubg'; // Replace with your key

webpush.setVapidDetails(
  'mailto:munnachakuli@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// --- DATABASE SETUP ---
let db;
async function connectToDb() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB');
}

// --- EXPRESS APP SETUP ---
const app = express();
app.use(express.json());

// API endpoint for clients to subscribe to push notifications
app.post('/api/subscribe', async (req, res) => {
  const subscription = req.body;
  try {
    // Store the subscription object in the database
    await db.collection('subscriptions').insertOne(subscription);
    console.log('Stored new push subscription');
    res.status(201).json({ message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving subscription', error);
    res.sendStatus(500);
  }
});

// API endpoint for clients to create an alert
app.post('/api/alerts', async (req, res) => {
    // In a real app, you'd associate this with a user and their subscription
    const { price, direction, subscription } = req.body;
    try {
        await db.collection('alerts').insertOne({ price, direction, subscription });
        console.log(`Stored new alert: ${direction} ${price}`);
        res.status(201).json({ message: 'Alert saved.' });
    } catch (error) {
        console.error('Error saving alert', error);
        res.sendStatus(500);
    }
});


// --- BINANCE WEBSOCKET ---
function connectToBinance() {
  const ws = new WebSocket(BINANCE_WS_URL);

  ws.on('open', () => {
    console.log('Connected to Binance WebSocket API');
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.k) { // kline data
      const currentPrice = parseFloat(message.k.c); // Close price
      // console.log(`Current BTC Price: $${currentPrice.toFixed(2)}`);
      checkAlerts(currentPrice);
    }
  });

  ws.on('close', () => {
    console.log('Disconnected from Binance. Reconnecting...');
    setTimeout(connectToBinance, 5000); // Reconnect after 5 seconds
  });

  ws.on('error', (err) => {
    console.error('Binance WebSocket Error:', err);
  });
}

// --- CORE LOGIC ---
async function checkAlerts(currentPrice) {
  if (!db) return;

  // Find all alerts that are triggered by the current price
  const triggeredAlerts = await db.collection('alerts').find({
    $or: [
      { direction: 'Above', price: { $lte: currentPrice } },
      { direction: 'Below', price: { $gte: currentPrice } },
    ]
  }).toArray();

  if (triggeredAlerts.length > 0) {
    console.log(`${triggeredAlerts.length} alerts triggered.`);
    for (const alert of triggeredAlerts) {
      sendNotification(alert, currentPrice);
      // Remove the alert from the DB after it's triggered
      db.collection('alerts').deleteOne({ _id: alert._id });
    }
  }
}

async function sendNotification(alert, currentPrice) {
  const subscription = alert.subscription;

  const getBaseAsset = (s) => s.replace(/USDT$/, '').toLowerCase();
  const iconUrl = `https://assets.coincap.io/assets/icons/${getBaseAsset(alert.symbol)}@2x.png`;
  
  const payload = JSON.stringify({
    title: `${alert.symbol} Price Alert!`,
    body: `Price crossed your target of $${alert.price}. Current price: $${currentPrice.toFixed(2)}`,
    icon: iconUrl,
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Push notification sent successfully.');
  } catch (error) {
    console.error('Error sending push notification:', error);
    // If subscription is expired or invalid, remove it from the DB
    if (error.statusCode === 410 || error.statusCode === 404) {
      db.collection('subscriptions').deleteOne({ endpoint: subscription.endpoint });
    }
  }
}

// --- START SERVER ---
async function startServer() {
  await connectToDb();
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  connectToBinance();
}

startServer();