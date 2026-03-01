Art Therapy — Aliyun Linux Deployment ManualThis manual provides the specific steps for deploying the Art Therapy application on an Alibaba Cloud (Aliyun) Linux instance (YUM-based).Stack OverviewFrontend: React + Vite (Static files served by Nginx)Backend: Node.js + Express (Managed by PM2)Database: PostgreSQL (Local)Cache: Redis (Local)Proxy/SSL: Nginx + Certbot1. Prerequisites (Aliyun Console)Security Group Rules: Open Inbound ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).DNS: Point your Domain A-records (@ and www) to your server's Public IP.2. Infrastructure Setup (YUM)# Update System
sudo yum update -y

# Install Node.js 20
curl -fsSL [https://rpm.nodesource.com/setup_20.x](https://rpm.nodesource.com/setup_20.x) | sudo bash -
sudo yum install -y nodejs

# Install Build Essentials & Tools
sudo yum groupinstall "Development Tools" -y
sudo yum install -y git nano wget

# Install Nginx (Bypass excludes if necessary)
sudo yum install nginx --disableexcludes=all -y

# Install Databases
sudo yum install -y postgresql-server postgresql-contrib redis
3. Database InitializationPostgreSQLsudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create Database User
sudo -u postgres psql
# Inside psql:
CREATE USER arttherapy WITH PASSWORD 'luyinart';
CREATE DATABASE arttherapy_db OWNER arttherapy;
GRANT ALL PRIVILEGES ON DATABASE arttherapy_db TO arttherapy;
\q
Redissudo systemctl enable redis
sudo systemctl start redis
4. Backend Deployment (Port 3001)Navigate to /home/admin/art-therapy/server:Environment Config (.env):NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://arttherapy:luyinart@127.0.0.1:5432/arttherapy_db"
CLIENT_URL="[https://luyin.xyz](https://luyin.xyz)"
Build and Start:npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Start with PM2
sudo npm install -g pm2
pm2 start dist/server.js --name art-therapy-api
pm2 save
pm2 startup
5. Frontend DeploymentNavigate to /home/admin/art-therapy/client:Environment Config (.env.production):VITE_API_URL=[https://luyin.xyz/api/v1](https://luyin.xyz/api/v1)
Build:npm install
npm run build
# Files generated in /home/admin/art-therapy/client/dist
6. Nginx Reverse Proxy & SSLCreate Config: sudo nano /etc/nginx/conf.d/art-therapy.confPaste Configuration:server {
    listen 80;
    server_name luyin.xyz www.luyin.xyz;

    root /home/admin/art-therapy/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/v1/ {
        proxy_pass [http://127.0.0.1:3001/api/v1/](http://127.0.0.1:3001/api/v1/);
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
Permissions & Restart:sudo chmod 755 /home/admin
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
SSL (Certbot):sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d luyin.xyz -d www.luyin.xyz
7. Maintenance CommandsUpdate Code: git pull origin mainRestart API: pm2 restart art-therapy-apiView Logs: pm2 logs art-therapy-apiCheck Nginx Logs: sudo tail -f /var/log/nginx/error.log