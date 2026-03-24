require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');

async function testRegister() {
    const adminData = {
        email: `test_${Date.now()}@example.com`,
        phone: `+923${Math.floor(Math.random() * 900000000 + 100000000)}`,
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'User',
    };

    const adminReg = await request(app).post('/api/v1/auth/register').send(adminData);
    console.log('Status:', adminReg.status);
    console.log('Body:', JSON.stringify(adminReg.body, null, 2));
    process.exit(0);
}

testRegister();
