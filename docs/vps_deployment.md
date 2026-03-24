# 🚀 VPS Deployment & CI/CD Guide (Beginner Friendly)

This guide will help you deploy your backend to a VPS (like DigitalOcean, AWS EC2, or Linode) and set up an automatic pipeline so that every time you push to GitHub, your server updates automatically.

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

## 5. SSL & Domain (Nginx)

To use a domain (e.g., `api.yourdomain.com`) with SSL (HTTPS):

1. Install Nginx: `sudo apt install nginx -y`
2. Install Certbot: `sudo apt install certbot python3-certbot-nginx -y`
3. Configure Nginx to proxy requests to port `5000`.
4. Run `sudo certbot --nginx` to get your free SSL certificate.

---

### Need help?
If you get stuck on any step, just ask! I can guide you through the Nginx configuration or SSH key generation.
