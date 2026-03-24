# 🚀 VPS Deployment & CI/CD Guide (Beginner Friendly)

This guide will help you deploy your backend to a VPS (like DigitalOcean, AWS EC2, or Linode) and set up an automatic pipeline so that every time you push to GitHub, your server updates automatically. and and

## 1. Prepare your VPS

SSH into your VPS and install Docker and Docker Compose:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Allow your user to run docker commands without sudo
sudo usermod -aG docker $USER
# (Now Logout and Login again for changes to take effect)
```

## 2. Setting up GitHub Secrets

To allow GitHub to talk to your VPS, you need to add "Repository Secrets":

1. Go to your GitHub Repository > **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** and add:
   - `VPS_HOST`: Your server's IP address.
   - `VPS_USER`: Your SSH username (usually `root` or `ubuntu`).
   - `VPS_SSH_KEY`: Your **Private** SSH key (the content of `~/.ssh/id_rsa`).

## 3. Initial Server Setup

Run these commands on your VPS **once** to prepare the project folder:

```bash
mkdir ~/food-delivery-backend
cd ~/food-delivery-backend
# Create a .env file with your production values
nano .env
```

Paste your production values (Supabase URL, JWT Secret, etc.) into the `.env` file.

## 4. How the CI/CD Pipeline Works

I have created a workflow in `.github/workflows/deploy.yml`. Here is what it does when you push to `main`:

1. **Builds** a new Docker image of your backend.
2. **Pushes** it to your private GitHub Container Registry.
3. **Connects** to your VPS via SSH.
4. **Updates** the backend container with the latest code.

## 5. Setting up api.codewithuzair.cloud (DNS)

To point your domain from Hostinger to your VPS:

1. Log in to **Hostinger** > **Domains** > **DNS/Nameservers**.
2. Add a new **A Record**:
   - **Type**: `A`
   - **Name**: `api` (this creates `api.codewithuzair.cloud`)
   - **Points to**: `YOUR_VPS_IP`
   - **TTL**: Default (e.g., 14400)
3. Save the record. It may take a few minutes to propagate.

## 6. SSL & Nginx Configuration

On your VPS, install Nginx and Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create an Nginx configuration file for your API:

```bash
sudo nano /etc/nginx/sites-available/food-delivery-api
```

Paste this configuration (replace with your domain):

```nginx
server {
    server_name api.codewithuzair.cloud;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/food-delivery-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Finally, get your free SSL certificate:

```bash
sudo certbot --nginx -d api.codewithuzair.cloud
```

----

## 7. Managing the Production Environment

Since the VPS uses a dedicated production configuration, you must always specify the file if you are using standard `docker-compose` commands:

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart the service
docker-compose -f docker-compose.prod.yml restart backend

# Stop the application
docker-compose -f docker-compose.prod.yml down

# Start the application manually
docker-compose -f docker-compose.prod.yml up -d
```

**Note:** If you run `docker-compose` without `-f docker-compose.prod.yml`, it will look for `docker-compose.yml`, which is now also synced to the server but contains development-specific settings (like a local database). Always prefer the `.prod.yml` file for production tasks.

----

### Need help?
If you get stuck on any step, just ask! I can guide you through the Nginx configuration or SSH key generation.
