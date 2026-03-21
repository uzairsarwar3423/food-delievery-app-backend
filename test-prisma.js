const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.mgrtjayscgtczumdnofg:yFhtDLGrdvenpUVa@13.239.87.90:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require',
    },
  },
});

async function main() {
  await prisma.$connect();
  console.log('Connected successfully to aws-1');
  await prisma.$disconnect();
}

main().catch(console.error);
