require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Force direct connection in this test
const directUrl = 'postgresql://postgres.mgrtjayscgtczumdnofg:yFhtDLGrdvenpUVa@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function test() {
  try {
    console.log('Attempting to connect to Prisma (Direct Port 5432)...');
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    const usersCount = await prisma.user.count();
    console.log('Users count:', usersCount);
  } catch (err) {
    console.error('❌ Connection failed:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
