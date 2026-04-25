require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding deals...');
  const restaurants = await prisma.restaurant.findMany({ take: 3 });
  
  if (restaurants.length === 0) {
    console.error('No restaurants found to attach deals to. Please seed restaurants first.');
    return;
  }

  // Clear existing deals if any
  await prisma.deal.deleteMany({});

  const dealsToSeed = [
    {
      title: '50% Off on All Large Pizzas',
      subtitle: 'Limited Time Offer',
      description: 'Enjoy a massive discount on our entire range of large pizzas.',
      imageUrl: 'https://placehold.co/400x400/FF6B35/FFFFFF?text=Pizza+Deal',
      gradientColors: ['#FF6B35', '#FFA07A'],
      restaurantId: restaurants[0].id,
      type: 'PERCENTAGE',
      value: 50,
      isActive: true,
      isFeatured: true,
      displayOrder: 1,
      minimumOrderAmount: 1000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      termsAndConditions: 'Applicable on large pizzas only. Cannot be combined with other offers.',
    },
    {
      title: 'Buy 1 Get 1 Free Burger',
      subtitle: 'Special Weekend Deal',
      description: 'Buy one premium burger and get a second one absolutely free.',
      imageUrl: 'https://placehold.co/400x400/FF1744/FFFFFF?text=Burger+Deal',
      gradientColors: ['#FF1744', '#FF5252'],
      restaurantId: restaurants[1 % restaurants.length].id,
      type: 'BOGO',
      value: 500, // E.g., value of burger
      isActive: true,
      isFeatured: true,
      displayOrder: 2,
      minimumOrderAmount: 800,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Valid for 2 days
      termsAndConditions: 'Valid on selected burgers only. Dine-in or pickup only.',
    },
    {
      title: 'Free Delivery on Orders above Rs. 500',
      subtitle: 'Available this week',
      description: 'Get free delivery directly to your door when you order Rs. 500 or more.',
      imageUrl: 'https://placehold.co/400x400/9C27B0/FFFFFF?text=Free+Delivery',
      gradientColors: ['#9C27B0', '#E1BEE7'],
      restaurantId: restaurants[2 % restaurants.length].id,
      type: 'FREE_DELIVERY',
      value: 100, // 100% off delivery
      isActive: true,
      isFeatured: false,
      displayOrder: 3,
      minimumOrderAmount: 500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Valid for 14 days
      termsAndConditions: 'Delivery discount max Rs. 100.',
    }
  ];

  for (const deal of dealsToSeed) {
    await prisma.deal.create({ data: deal });
  }

  console.log('Successfully seeded deals.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
