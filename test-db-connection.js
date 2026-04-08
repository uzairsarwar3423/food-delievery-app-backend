const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;
    console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':****@'));

    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log('✅ Successfully connected to the database using pg client');
        const res = await client.query('SELECT NOW()');
        console.log('Query Result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Failed to connect to the database:', err.message);
        console.error(err);
        process.exit(1);
    }
}

testConnection();
