const restaurantService = require('./src/services/restaurant.service');

async function main() {
    process.env.CLOUDINARY_API_KEY = "test"; // mock
    console.log("Mocking dependencies...");
    restaurantService.restaurantRepository = {
        findById: async () => ({ id: '1', ownerId: 'user1', logoUrl: 'old' }),
        update: async (id, data) => { console.log('PRISMA UPDATE:', id, data); return { ...data, id }; }
    };
    
    restaurantService.uploadService = {
        getPublicIdFromUrl: () => 'public_id',
        deleteImage: async () => console.log('deleteImage called'),
        uploadImage: async (path, folder) => {
            console.log('uploadImage called', path, folder);
            return { secure_url: 'new_url_' + path };
        }
    };
    
    restaurantService.cacheService = {
        clearRestaurantCache: async () => {}
    };

    console.log("Testing updateRestaurant...");
    const files = {
        logo: [{ path: 'temp_logo.jpg' }],
        banner: [{ path: 'temp_banner.jpg' }]
    };
    const updateData = { name: "Test" };
    
    await restaurantService.updateRestaurant('1', 'user1', updateData, files, false);
}
main().catch(console.error);
