import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email) {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: true }
        });
        console.log(`Successfully made ${user.email} an admin!`);
    } catch (error) {
        console.error('Error making user admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

makeAdmin('agaraanya@gmail.com'); 