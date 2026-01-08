import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';
import couchdbRouter from './couchdb';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount CouchDB-compatible API
app.use('/', couchdbRouter);

app.listen(port, async () => {
    await initDb();
    console.log(`CouchDB-compatible server running at http://localhost:${port}`);
});
