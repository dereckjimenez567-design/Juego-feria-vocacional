const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Accounting2026';
const DB_NAME = 'bullorbear';
const COLLECTION = 'leaderboard';

let db = null;

async function connectDB() {
    if (!MONGO_URI) {
        console.error('❌ ERROR: MONGO_URI no está definido en las variables de entorno');
        return;
    }
    try {
        console.log('🔄 Conectando a MongoDB...');
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ MongoDB conectado exitosamente');
        await db.collection(COLLECTION).createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 86400 }
        );
        console.log('✅ Índice TTL creado');
    } catch (err) {
        console.error('❌ Error conectando MongoDB:', err.message);
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// GET leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        if (!db) return res.json([]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scores = await db.collection(COLLECTION)
            .find({ createdAt: { $gte: today } })
            .sort({ money: -1 })
            .limit(5)
            .toArray();
        res.json(scores);
    } catch (err) {
        console.error('Error GET leaderboard:', err.message);
        res.status(500).json([]);
    }
});

// POST guardar score
app.post('/api/leaderboard', async (req, res) => {
    try {
        if (!db) return res.json([]);
        const { name, money, level } = req.body;
        if (!name || !money) return res.status(400).json({ error: 'Datos incompletos' });

        await db.collection(COLLECTION).insertOne({
            name,
            money,
            level: level || 'normal',
            createdAt: new Date()
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scores = await db.collection(COLLECTION)
            .find({ createdAt: { $gte: today } })
            .sort({ money: -1 })
            .limit(5)
            .toArray();

        res.json(scores);
    } catch (err) {
        console.error('Error POST leaderboard:', err.message);
        res.status(500).json([]);
    }
});

// DELETE limpiar leaderboard
app.delete('/api/leaderboard', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        if (db) await db.collection(COLLECTION).deleteMany({});
        res.json({ success: true });
    } catch (err) {
        console.error('Error DELETE leaderboard:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🎮 BULL OR BEAR corriendo en puerto ${PORT}`);
        console.log(`📊 MongoDB: ${db ? 'Conectado' : 'No conectado'}`);
    });
});
