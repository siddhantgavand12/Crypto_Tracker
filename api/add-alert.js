// api/add-alert.js
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('cryptotrack');
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { alert, subscription } = req.body;

    if (!alert || !subscription || !subscription.endpoint) {
        return res.status(400).json({ message: 'Missing alert or subscription data.' });
    }

    const db = await connectToDatabase();
    
    const alertToInsert = {
      ...alert,
      subscriptionEndpoint: subscription.endpoint, // Link alert to a specific subscription
      createdAt: new Date(),
    };
    
    await db.collection('alerts').insertOne(alertToInsert);

    res.status(201).json({ message: 'Alert saved.' });
  } catch (error) {
    console.error('Error saving alert:', error);
    res.status(500).json({ message: 'Failed to save alert.' });
  }
}