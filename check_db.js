require('dotenv').config();
const { prisma } = require('./src/config/database');

async function check() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: { contains: 'rider' } },
            orderBy: { createdAt: 'desc' },
            include: { deliveryProfile: true }
        });

        if (user) {
            console.log('--- USER FOUND IN DB ---');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Rider Profile ID:', user.deliveryProfile?.id || 'NOT FOUND');
        } else {
            console.log('NO RIDER USER FOUND IN DB');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
