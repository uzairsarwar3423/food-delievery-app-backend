require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
    console.log('Testing Cloudinary Upload...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

    // Use the user's image
    const testFilePath = path.join(process.cwd(), 'Veggie-Chickpea-Burger.jpg');
    console.log('Test file path:', testFilePath);
    if (!fs.existsSync(testFilePath)) {
        console.error('Test file does not exist!');
        return;
    }

    try {
        const result = await cloudinary.uploader.upload(testFilePath, {
            folder: 'test-folder',
            resource_type: 'image'
        });
        console.log('Upload Success:', result);
    } catch (error) {
        console.error('Upload Failed:');
        console.error('Full Error Object:', error);
        console.error('Error Message:', error.message);
    } finally {
        // No need to delete node_modules file
    }
}

testUpload();
