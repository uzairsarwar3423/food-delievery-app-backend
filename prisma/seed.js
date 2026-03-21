// =============================================================
// Prisma Seed — Food Delivery Backend
// Populates database with realistic sample data
// =============================================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────

const hashPassword = async (password) => bcrypt.hash(password, 12);

const CATEGORIES = [
    { name: 'Burgers', slug: 'burgers', description: 'Juicy burgers and sandwiches', displayOrder: 1 },
    { name: 'Pizza', slug: 'pizza', description: 'Wood-fired and classic pizzas', displayOrder: 2 },
    { name: 'Biryani', slug: 'biryani', description: 'Authentic rice dishes', displayOrder: 3 },
    { name: 'Chinese', slug: 'chinese', description: 'Asian noodles, dumplings & more', displayOrder: 4 },
    { name: 'Desserts', slug: 'desserts', description: 'Cakes, ice creams & sweets', displayOrder: 5 },
];

const CUISINES = ['Pakistani', 'American', 'Italian', 'Chinese', 'Fast Food', 'Continental'];

const RESTAURANT_DATA = [
    {
        name: 'The Burger Lab',
        slug: 'the-burger-lab',
        description: 'Premium gourmet burgers crafted with 100% beef patties and fresh ingredients.',
        phone: '03001234567',
        email: 'contact@burgerlab.pk',
        addressLine1: '45 Main Boulevard',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54000',
        latitude: '31.5204',
        longitude: '74.3587',
        cuisineTypes: ['American', 'Fast Food'],
        tags: ['burger', 'grill', 'fast-food'],
        openingTime: '11:00',
        closingTime: '23:00',
        deliveryFee: 49,
        minimumOrderAmount: 300,
        estimatedDeliveryMin: 20,
        estimatedDeliveryMax: 40,
    },
    {
        name: 'Pizza Palace',
        slug: 'pizza-palace',
        description: 'Authentic Italian pizzas baked in our stone-fired oven.',
        phone: '03001234568',
        email: 'hello@pizzapalace.pk',
        addressLine1: '12 MM Alam Road',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54600',
        latitude: '31.5084',
        longitude: '74.3478',
        cuisineTypes: ['Italian'],
        tags: ['pizza', 'italian', 'pasta'],
        openingTime: '12:00',
        closingTime: '00:00',
        deliveryFee: 59,
        minimumOrderAmount: 400,
        estimatedDeliveryMin: 25,
        estimatedDeliveryMax: 45,
    },
    {
        name: 'Biryani Basha',
        slug: 'biryani-basha',
        description: 'Traditional dum biryani cooked with aged basmati rice and secret spices.',
        phone: '03001234569',
        email: 'order@biryanibasha.pk',
        addressLine1: '78 Gulberg III',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54660',
        latitude: '31.5116',
        longitude: '74.3393',
        cuisineTypes: ['Pakistani'],
        tags: ['biryani', 'rice', 'pakistani'],
        openingTime: '10:00',
        closingTime: '22:00',
        deliveryFee: 39,
        minimumOrderAmount: 250,
        estimatedDeliveryMin: 30,
        estimatedDeliveryMax: 50,
    },
    {
        name: 'Dragon Wok',
        slug: 'dragon-wok',
        description: 'Authentic Chinese cuisine with fresh ingredients and bold flavors.',
        phone: '03001234570',
        email: 'info@dragonwok.pk',
        addressLine1: '33 DHA Phase 5',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54792',
        latitude: '31.4697',
        longitude: '74.4018',
        cuisineTypes: ['Chinese', 'Asian'],
        tags: ['chinese', 'noodles', 'dim-sum'],
        openingTime: '11:30',
        closingTime: '23:30',
        deliveryFee: 69,
        minimumOrderAmount: 500,
        estimatedDeliveryMin: 25,
        estimatedDeliveryMax: 45,
    },
    {
        name: 'Sweet Cravings',
        slug: 'sweet-cravings',
        description: 'Artisanal desserts, premium ice creams and freshly baked pastries.',
        phone: '03001234571',
        email: 'sweets@cravings.pk',
        addressLine1: '9 Bahria Town Phase 4',
        city: 'Rawalpindi',
        state: 'Punjab',
        postalCode: '46000',
        latitude: '33.5176',
        longitude: '73.1013',
        cuisineTypes: ['Desserts', 'Bakery'],
        tags: ['desserts', 'ice-cream', 'cakes'],
        openingTime: '10:00',
        closingTime: '23:00',
        deliveryFee: 49,
        minimumOrderAmount: 200,
        estimatedDeliveryMin: 15,
        estimatedDeliveryMax: 35,
    },
    {
        name: 'KarachiWala',
        slug: 'karachiwala',
        description: 'Street-style karahi, nihari, and traditional Karachi food.',
        phone: '03001234572',
        email: 'eat@karachiwala.pk',
        addressLine1: '200 Clifton Block 5',
        city: 'Karachi',
        state: 'Sindh',
        postalCode: '75600',
        latitude: '24.8095',
        longitude: '67.0398',
        cuisineTypes: ['Pakistani'],
        tags: ['karahi', 'nihari', 'desi'],
        openingTime: '08:00',
        closingTime: '02:00',
        deliveryFee: 35,
        minimumOrderAmount: 350,
        estimatedDeliveryMin: 35,
        estimatedDeliveryMax: 55,
    },
    {
        name: 'The Wrap Co.',
        slug: 'the-wrap-co',
        description: 'Healthy wraps, salads, and bowls for the health-conscious foodie.',
        phone: '03001234573',
        email: 'fresh@wrapco.pk',
        addressLine1: '7 F-7 Markaz',
        city: 'Islamabad',
        state: 'ICT',
        postalCode: '44000',
        latitude: '33.7266',
        longitude: '73.0479',
        cuisineTypes: ['Continental', 'Healthy'],
        tags: ['wraps', 'healthy', 'salads'],
        openingTime: '09:00',
        closingTime: '22:00',
        deliveryFee: 55,
        minimumOrderAmount: 400,
        estimatedDeliveryMin: 20,
        estimatedDeliveryMax: 40,
    },
    {
        name: 'Shawarma Station',
        slug: 'shawarma-station',
        description: 'Authentic Lebanese-style shawarma wraps and platters.',
        phone: '03001234574',
        email: 'hi@shawarmastation.pk',
        addressLine1: '55 Blue Area',
        city: 'Islamabad',
        state: 'ICT',
        postalCode: '44000',
        latitude: '33.7232',
        longitude: '73.0696',
        cuisineTypes: ['Lebanese', 'Middle Eastern'],
        tags: ['shawarma', 'kebab', 'middle-eastern'],
        openingTime: '11:00',
        closingTime: '02:00',
        deliveryFee: 45,
        minimumOrderAmount: 300,
        estimatedDeliveryMin: 20,
        estimatedDeliveryMax: 35,
    },
    {
        name: 'Tandoori Nights',
        slug: 'tandoori-nights',
        description: 'Classic tandoor-cooked meats and fresh naan from the clay oven.',
        phone: '03001234575',
        email: 'grill@tandoorinights.pk',
        addressLine1: '14 Liberty Market',
        city: 'Lahore',
        state: 'Punjab',
        postalCode: '54600',
        latitude: '31.5059',
        longitude: '74.3448',
        cuisineTypes: ['Pakistani', 'Grill'],
        tags: ['tandoor', 'tikka', 'bbq'],
        openingTime: '18:00',
        closingTime: '02:00',
        deliveryFee: 39,
        minimumOrderAmount: 400,
        estimatedDeliveryMin: 30,
        estimatedDeliveryMax: 50,
    },
    {
        name: 'Noodle House',
        slug: 'noodle-house',
        description: 'Pan-Asian noodles, ramen, and stir-fry dishes.',
        phone: '03001234576',
        email: 'slurp@noodlehouse.pk',
        addressLine1: '88 Satellite Town',
        city: 'Rawalpindi',
        state: 'Punjab',
        postalCode: '46300',
        latitude: '33.5651',
        longitude: '73.0169',
        cuisineTypes: ['Japanese', 'Korean', 'Chinese'],
        tags: ['ramen', 'noodles', 'asian'],
        openingTime: '12:00',
        closingTime: '23:00',
        deliveryFee: 60,
        minimumOrderAmount: 450,
        estimatedDeliveryMin: 25,
        estimatedDeliveryMax: 45,
    },
];

const MENU_ITEMS_BY_RESTAURANT = {
    'the-burger-lab': [
        { name: 'Classic Smash Burger', price: 450, cat: 'burgers', veg: false, spice: 1 },
        { name: 'Double Bacon Blast', price: 650, cat: 'burgers', veg: false, spice: 2 },
        { name: 'Crispy Chicken Burger', price: 520, cat: 'burgers', veg: false, spice: 2 },
        { name: 'Veggie Delight Burger', price: 380, cat: 'burgers', veg: true, spice: 1 },
        { name: 'Loaded Fries', price: 220, cat: 'burgers', veg: true, spice: 0 },
    ],
    'pizza-palace': [
        { name: 'Margherita Classic', price: 680, cat: 'pizza', veg: true, spice: 0 },
        { name: 'BBQ Chicken Supreme', price: 850, cat: 'pizza', veg: false, spice: 1 },
        { name: 'Pepperoni Lover', price: 820, cat: 'pizza', veg: false, spice: 1 },
        { name: 'Veggie Garden', price: 720, cat: 'pizza', veg: true, spice: 0 },
        { name: 'Garlic Bread', price: 180, cat: 'pizza', veg: true, spice: 0 },
    ],
    'biryani-basha': [
        { name: 'Chicken Biryani (Full)', price: 550, cat: 'biryani', veg: false, spice: 3 },
        { name: 'Mutton Biryani (Full)', price: 750, cat: 'biryani', veg: false, spice: 3 },
        { name: 'Vegetable Biryani', price: 420, cat: 'biryani', veg: true, spice: 2 },
        { name: 'Raita', price: 80, cat: 'biryani', veg: true, spice: 0 },
        { name: 'Chicken Biryani (Half)', price: 300, cat: 'biryani', veg: false, spice: 3 },
    ],
    'dragon-wok': [
        { name: 'Beef Chow Mein', price: 480, cat: 'chinese', veg: false, spice: 2 },
        { name: 'Chicken Manchurian', price: 520, cat: 'chinese', veg: false, spice: 2 },
        { name: 'Vegetable Spring Rolls (6pcs)', price: 280, cat: 'chinese', veg: true, spice: 1 },
        { name: 'Prawn Fried Rice', price: 560, cat: 'chinese', veg: false, spice: 1 },
        { name: 'Dim Sum Basket', price: 380, cat: 'chinese', veg: false, spice: 1 },
    ],
    'sweet-cravings': [
        { name: 'Chocolate Lava Cake', price: 320, cat: 'desserts', veg: true, spice: 0 },
        { name: 'Nutella Waffle', price: 280, cat: 'desserts', veg: true, spice: 0 },
        { name: 'Double Scoop Ice Cream', price: 180, cat: 'desserts', veg: true, spice: 0 },
        { name: 'Tiramisu', price: 350, cat: 'desserts', veg: true, spice: 0 },
        { name: 'Fruit Trifle', price: 250, cat: 'desserts', veg: true, spice: 0 },
    ],
};

// ─── Main Seed Function ───────────────────────────────────────

async function main() {
    console.log('🌱 Starting database seeding...\n');

    // ── 1. Admin User ─────────────────────────────────────────
    console.log('👤 Creating admin user...');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@fooddelivery.pk' },
        update: {},
        create: {
            email: 'admin@fooddelivery.pk',
            phone: '03000000001',
            passwordHash: await hashPassword('Admin@123456'),
            firstName: 'Super',
            lastName: 'Admin',
            role: 'ADMIN',
            isEmailVerified: true,
            isPhoneVerified: true,
        },
    });
    console.log(`   ✅ Admin: ${admin.email}`);

    // ── 2. Sample Customers ───────────────────────────────────
    console.log('\n👥 Creating customers...');
    const customerData = [
        { email: 'ali.khan@gmail.com', phone: '03001111001', first: 'Ali', last: 'Khan' },
        { email: 'sara.ahmed@gmail.com', phone: '03001111002', first: 'Sara', last: 'Ahmed' },
        { email: 'hamza.malik@gmail.com', phone: '03001111003', first: 'Hamza', last: 'Malik' },
        { email: 'ayesha.siddiqui@gmail.com', phone: '03001111004', first: 'Ayesha', last: 'Siddiqui' },
        { email: 'usman.raza@gmail.com', phone: '03001111005', first: 'Usman', last: 'Raza' },
    ];

    const customers = [];
    for (const c of customerData) {
        const user = await prisma.user.upsert({
            where: { email: c.email },
            update: {},
            create: {
                email: c.email,
                phone: c.phone,
                passwordHash: await hashPassword('Customer@123'),
                firstName: c.first,
                lastName: c.last,
                role: 'CUSTOMER',
                isEmailVerified: true,
            },
        });
        customers.push(user);
        console.log(`   ✅ Customer: ${user.email}`);
    }

    // ── 3. Customer Addresses ─────────────────────────────────
    console.log('\n📍 Creating customer addresses...');
    for (const customer of customers) {
        await prisma.userAddress.create({
            data: {
                userId: customer.id,
                label: 'Home',
                addressLine1: `${faker.number.int({ min: 1, max: 200 })} ${faker.location.street()}`,
                city: 'Lahore',
                state: 'Punjab',
                postalCode: '54000',
                country: 'PK',
                latitude: 31.5204 + (Math.random() - 0.5) * 0.1,
                longitude: 74.3587 + (Math.random() - 0.5) * 0.1,
                isDefault: true,
            },
        });
    }
    console.log('   ✅ Addresses created');

    // ── 4. Restaurant Owners ──────────────────────────────────
    console.log('\n🏪 Creating restaurant owners...');
    const ownerData = [
        { email: 'owner1@burgerlab.pk', phone: '03002222001', first: 'Ibrahim', last: 'Sheikh' },
        { email: 'owner2@pizzapalace.pk', phone: '03002222002', first: 'Fatima', last: 'Nawaz' },
        { email: 'owner3@biryanibasha.pk', phone: '03002222003', first: 'Tariq', last: 'Hussain' },
    ];

    const owners = [];
    for (const o of ownerData) {
        const user = await prisma.user.upsert({
            where: { email: o.email },
            update: {},
            create: {
                email: o.email,
                phone: o.phone,
                passwordHash: await hashPassword('Owner@123456'),
                firstName: o.first,
                lastName: o.last,
                role: 'RESTAURANT_OWNER',
                isEmailVerified: true,
            },
        });
        owners.push(user);
        console.log(`   ✅ Owner: ${user.email}`);
    }

    // ── 5. Categories ─────────────────────────────────────────
    console.log('\n🗂️  Creating categories...');
    const categoryMap = {};
    for (const cat of CATEGORIES) {
        const category = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: {
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                displayOrder: cat.displayOrder,
                isActive: true,
            },
        });
        categoryMap[cat.slug] = category.id;
        console.log(`   ✅ Category: ${category.name}`);
    }

    // ── 6. Restaurants ────────────────────────────────────────
    console.log('\n🍽️  Creating restaurants...');
    const restaurantMap = {};

    for (let i = 0; i < RESTAURANT_DATA.length; i++) {
        const r = RESTAURANT_DATA[i];
        const owner = owners[i % owners.length];

        const restaurant = await prisma.restaurant.upsert({
            where: { slug: r.slug },
            update: {},
            create: {
                ownerId: owner.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                phone: r.phone,
                email: r.email,
                addressLine1: r.addressLine1,
                city: r.city,
                state: r.state,
                postalCode: r.postalCode,
                country: 'PK',
                latitude: r.latitude,
                longitude: r.longitude,
                status: 'APPROVED',
                isOpen: true,
                openingTime: r.openingTime,
                closingTime: r.closingTime,
                deliveryFee: r.deliveryFee,
                minimumOrderAmount: r.minimumOrderAmount,
                estimatedDeliveryMin: r.estimatedDeliveryMin,
                estimatedDeliveryMax: r.estimatedDeliveryMax,
                averageRating: (Math.random() * 2 + 3).toFixed(1),
                totalReviews: Math.floor(Math.random() * 500) + 50,
                cuisineTypes: r.cuisineTypes,
                tags: r.tags,
                commissionRate: 10,
            },
        });
        restaurantMap[r.slug] = restaurant.id;
        console.log(`   ✅ Restaurant: ${restaurant.name}`);
    }

    // ── 7. Menu Items ─────────────────────────────────────────
    console.log('\n🍔 Creating menu items...');
    let menuCount = 0;

    for (const [slug, items] of Object.entries(MENU_ITEMS_BY_RESTAURANT)) {
        const restaurantId = restaurantMap[slug];
        if (!restaurantId) {
            continue;
        }

        for (const item of items) {
            const categoryId = categoryMap[item.cat];
            const itemName = item.name;
            const slug = itemName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            await prisma.menuItem.create({
                data: {
                    restaurantId,
                    categoryId,
                    name: itemName,
                    slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
                    description: `Delicious ${itemName} prepared fresh to order with premium ingredients.`,
                    price: item.price,
                    isAvailable: true,
                    isVegetarian: item.veg,
                    spiceLevel: item.spice,
                    preparationTime: Math.floor(Math.random() * 15) + 10,
                    averageRating: (Math.random() * 1.5 + 3.5).toFixed(1),
                    totalOrders: Math.floor(Math.random() * 300) + 10,
                    tags: [item.cat, item.veg ? 'vegetarian' : 'non-veg'],
                    nutritionInfo: {
                        calories: Math.floor(Math.random() * 500) + 200,
                        protein: '15g',
                        carbs: '40g',
                        fat: '10g'
                    }
                },
            });
            menuCount++;
        }
    }

    // Add more menu items for remaining restaurants without predefined menus
    const remainingSlugs = Object.keys(restaurantMap).filter(
        (s) => !Object.keys(MENU_ITEMS_BY_RESTAURANT).includes(s),
    );
    const allCatIds = Object.values(categoryMap);

    for (const slug of remainingSlugs) {
        const restaurantId = restaurantMap[slug];
        for (let i = 0; i < 5; i++) {
            const categoryId = allCatIds[Math.floor(Math.random() * allCatIds.length)];
            const itemName = faker.food?.dish() || `Special Dish ${i + 1}`;
            const itemSlug = itemName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            await prisma.menuItem.create({
                data: {
                    restaurantId,
                    categoryId,
                    name: itemName,
                    slug: `${itemSlug}-${Math.floor(Math.random() * 1000)}`,
                    description: 'A chef special prepared with the finest ingredients.',
                    price: Math.floor(Math.random() * 600) + 200,
                    isAvailable: true,
                    isVegetarian: Math.random() > 0.6,
                    spiceLevel: Math.floor(Math.random() * 4),
                    preparationTime: Math.floor(Math.random() * 20) + 10,
                    averageRating: (Math.random() * 1.5 + 3.5).toFixed(1),
                    totalOrders: Math.floor(Math.random() * 200) + 5,
                    tags: ['special', 'chef-choice'],
                    nutritionInfo: {
                        calories: Math.floor(Math.random() * 600) + 300,
                        protein: '20g',
                        carbs: '30g',
                        fat: '15g'
                    }
                },
            });
            menuCount++;
        }
    }
    console.log(`   ✅ Created ${menuCount} menu items`);

    // ── 8. Delivery Riders ────────────────────────────────────
    console.log('\n🛵 Creating delivery riders...');
    const riderData = [
        { email: 'rider1@delivery.pk', phone: '03003333001', first: 'Kamran', last: 'Butt' },
        { email: 'rider2@delivery.pk', phone: '03003333002', first: 'Naveed', last: 'Iqbal' },
        { email: 'rider3@delivery.pk', phone: '03003333003', first: 'Shahid', last: 'Afridi' },
    ];

    for (let i = 0; i < riderData.length; i++) {
        const r = riderData[i];
        const user = await prisma.user.upsert({
            where: { email: r.email },
            update: {},
            create: {
                email: r.email,
                phone: r.phone,
                passwordHash: await hashPassword('Rider@123456'),
                firstName: r.first,
                lastName: r.last,
                role: 'DELIVERY_PERSON',
                isEmailVerified: true,
            },
        });

        await prisma.deliveryPerson.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                vehicleType: i === 0 ? 'bike' : i === 1 ? 'car' : 'bicycle',
                vehicleNumber: `LHR-${1000 + i}`,
                licenseNumber: `LIC${200000 + i}`,
                cnicNumber: `3520${1000000 + i}`,
                currentLatitude: 31.5204 + (Math.random() - 0.5) * 0.2,
                currentLongitude: 74.3587 + (Math.random() - 0.5) * 0.2,
                status: i === 0 ? 'ONLINE' : 'OFFLINE',
                isDocumentVerified: true,
                totalDeliveries: Math.floor(Math.random() * 1000) + 100,
                averageRating: (Math.random() * 1 + 4).toFixed(1),
                totalEarnings: Math.floor(Math.random() * 100000) + 20000,
            },
        });
        console.log(`   ✅ Rider: ${user.email}`);
    }

    // ── 9. Sample Coupons ─────────────────────────────────────
    console.log('\n🎟️  Creating coupons...');
    const coupons = [
        {
            code: 'WELCOME20',
            description: '20% off your first order',
            type: 'PERCENTAGE',
            discountValue: 20,
            minimumOrderAmount: 500,
            maximumDiscountAmount: 200,
            usageLimit: 1000,
            usageLimitPerUser: 1,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        {
            code: 'FREESHIP',
            description: 'Free delivery on any order',
            type: 'FREE_DELIVERY',
            discountValue: 0,
            minimumOrderAmount: 300,
            usageLimit: 500,
            usageLimitPerUser: 2,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
            code: 'SAVE100',
            description: 'Flat Rs.100 off on orders above Rs.600',
            type: 'FIXED_AMOUNT',
            discountValue: 100,
            minimumOrderAmount: 600,
            usageLimit: 2000,
            usageLimitPerUser: 3,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
    ];

    for (const coupon of coupons) {
        await prisma.coupon.upsert({
            where: { code: coupon.code },
            update: {},
            create: coupon,
        });
        console.log(`   ✅ Coupon: ${coupon.code}`);
    }

    // ── Summary ───────────────────────────────────────────────
    const counts = {
        users: await prisma.user.count(),
        restaurants: await prisma.restaurant.count(),
        categories: await prisma.category.count(),
        menuItems: await prisma.menuItem.count(),
        deliveryPersons: await prisma.deliveryPerson.count(),
        coupons: await prisma.coupon.count(),
        addresses: await prisma.userAddress.count(),
    };

    console.log('\n✨ Seeding complete!\n');
    console.log('📊 Database Summary:');
    console.table(counts);
    console.log('\n🔑 Test Credentials:');
    console.log('   Admin:    admin@fooddelivery.pk    / Admin@123456');
    console.log('   Customer: ali.khan@gmail.com       / Customer@123');
    console.log('   Owner:    owner1@burgerlab.pk      / Owner@123456');
    console.log('   Rider:    rider1@delivery.pk       / Rider@123456');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
