# 🚀 Deployment Guide

This guide covers the steps required to deploy the Food Delivery Backend to a production environment.

## 📋 Production Checklist

1. **Environment Variables**: Ensure all variables in `.env` are set correctly for production.
2. **Database Migration**: Run `npx prisma migrate deploy` to apply migrations to the production database.
3. **Security**: 
    - Use `helmet` for security headers (already integrated).
    - Set `NODE_ENV=production`.
    - Ensure `CORS_ORIGIN` is restricted to your frontend domain.
4. **Performance**: 
    - Enable Redis caching for high-traffic endpoints.
    - Use a process manager like PM2.

## 🔄 Using PM2 (Process Manager 2)

PM2 is recommended for managing the Node.js process in production.

### Installation
```bash
npm install pm2 -g
```

### Starting the Server
```bash
pm2 start src/server.js --name "food-delivery-api"
```

### Common Commands
- **Monitor**: `pm2 monit`
- **Logs**: `pm2 logs food-delivery-api`
- **Restart**: `pm2 restart food-delivery-api`
- **Stop**: `pm2 stop food-delivery-api`

## ☁️ Cloud Deployment

### Supabase (Database)
1. Provide the `DATABASE_URL` (Connection Pooler) and `DIRECT_URL` (Direct Connection) from your Supabase project settings.
2. Ensure the IP of your application server is whitelisted if you have restricted access.

### Redis Cloud
1. Create a Redis instance on [Redis Cloud](https://redis.com/cloud/overview/).
2. Copy the endpoint address and password into your `.env` file.

### Cloudinary (Media)
1. Use your production Cloudinary cloud name, API key, and API secret.
2. Images will be automatically optimized via the `ImageService`.

## 🛠️ Docker Deployment (Optional)

If you prefer Docker, you can use the following `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t food-delivery-api .
docker run -p 5000:5000 --env-file .env food-delivery-api
```
