---
title: " Deploy a MERN Stack App to AWS with Docker-Compose, GitHub Actions and Apache"
date: 2025-12-30T14:21:30+05:00
draft: false
---

*A complete guide to setting up CI/CD for your React + Express + MongoDB application*

---

If you've built a MERN stack application and want to deploy it to AWS with automated deployments, this guide is for you. We'll walk through the entire process step by step, explaining **why** we make each decision along the way.

## What We're Building

By the end of this guide, you'll have:
- A **React frontend** running on a public EC2 instance
- An **Express backend + MongoDB** running on a private EC2 instance
- **Automated deployments** via GitHub Actions
- A **secure architecture** where only the frontend is exposed to the internet

![architecture](./architecture.png)

---

# The Problem: Private Subnets Have No Internet

Before we dive into the deployment, we need to understand a key challenge.

## Why Do We Use Private Subnets?

In AWS, we put sensitive services (databases, APIs) in **private subnets** so they can't be accessed from the internet. This is a security best practice.

**But here's the problem:** If a server has no internet access, how can it:
- Download Docker?
- Pull Docker images (like `mongo:6`)?
- Install npm packages?

We have two solutions:

| Solution | Cost | What It Does |
|----------|------|--------------|
| **NAT Gateway** | ~$32/month | Gives private subnet full outbound internet access |
| **VPC Endpoints** | ~$14/month | Creates private tunnels to specific AWS services (like ECR) |

Let's look at both.

---

## Solution 1: NAT Gateway

A **NAT Gateway** acts as a middleman. Your private EC2 sends requests to the NAT Gateway, which forwards them to the internet using its public IP.

```
Private EC2 → NAT Gateway → Internet Gateway → Internet
     ↑                              ↓
     └────────── Response ──────────┘
```

### Terraform Code

```hcl
# First, we need an Elastic IP (a static public IP address)
resource "aws_eip" "nat_1" {
  domain = "vpc"
  tags = { Name = "NAT-EIP" }
}

# Create the NAT Gateway in the PUBLIC subnet
# (It needs internet access to forward requests)
resource "aws_nat_gateway" "nat_1" {
  allocation_id = aws_eip.nat_1.id
  subnet_id     = aws_subnet.public_subnet_1.id
  
  tags = { Name = "NAT-Gateway" }
  
  # Wait for Internet Gateway to be created first
  depends_on = [aws_internet_gateway.gw]
}

# Update the PRIVATE route table to use NAT Gateway
resource "aws_route_table" "private_RT_1" {
  vpc_id = aws_vpc.my-vpc.id

  # All internet traffic (0.0.0.0/0) goes through NAT
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_1.id
  }

  tags = { Name = "private_RT_1" }
}
```

**Why This Works:**
- The private EC2 has no public IP
- When it needs to reach the internet, it sends packets to the NAT Gateway
- NAT Gateway uses its Elastic IP to communicate with the internet
- Responses come back through the same path

---

## Solution 2: VPC Endpoints (For ECR Only)

If you only need to pull Docker images and want to save money, you can use **VPC Endpoints**. These create private connections to AWS services without going through the internet.

### What is ECR?

**Amazon ECR** (Elastic Container Registry) is like Docker Hub, but private and hosted by AWS. You push your Docker images there, and your EC2 instances can pull them.

### Terraform Code

```hcl
# Create an ECR repository to store our backend image
resource "aws_ecr_repository" "backend" {
  name = "mern-backend"
  image_tag_mutability = "MUTABLE"
}

# Security group for the VPC endpoints
resource "aws_security_group" "vpc_endpoints_sg" {
  name   = "vpc-endpoints-sg"
  vpc_id = aws_vpc.my-vpc.id

  # Allow HTTPS traffic (ECR uses HTTPS)
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.db_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECR API Endpoint - for ECR API calls
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.my-vpc.id
  service_name        = "com.amazonaws.us-east-1.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_subnet_1.id]
  security_group_ids  = [aws_security_group.vpc_endpoints_sg.id]
  private_dns_enabled = true
}

# ECR Docker Endpoint - for docker pull/push commands
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.my-vpc.id
  service_name        = "com.amazonaws.us-east-1.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.private_subnet_1.id]
  security_group_ids  = [aws_security_group.vpc_endpoints_sg.id]
  private_dns_enabled = true
}

# S3 Endpoint - ECR stores Docker layers in S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.my-vpc.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private_RT_1.id]
}
```

**Important Limitation:** With VPC Endpoints alone, you can only pull images from ECR, not Docker Hub. So you'd need to:
1. Build your images (including MongoDB) in GitHub Actions
2. Push them to ECR
3. Pull from ECR on your private EC2

---

# Part 2: Deploying the Frontend

Now let's set up the frontend. We'll show both Nginx and Apache options.

## Understanding the Frontend's Job

The frontend does two things:
1. **Serves the React app** (static HTML/CSS/JS files)
2. **Proxies API requests** to the backend (so users don't need to know the backend's address)

```
User Request: /api/todos
       ↓
Frontend (Nginx/Apache): "This is for /api, let me forward it"
       ↓
Backend: Here's the data
       ↓
Frontend: Returns data to user
```

---

##Using Apache


### apache.conf

```apache
<VirtualHost *:80>
    DocumentRoot "/usr/local/apache2/htdocs"

    <Directory "/usr/local/apache2/htdocs">
        # Enable .htaccess-like rewrite rules
        RewriteEngine On
        
        # If the file doesn't exist, serve index.html (for React Router)
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_URI} !^/api
        RewriteRule ^ index.html [L]
    </Directory>

    # Proxy /api/* requests to backend
    ProxyPass /api/ http://BACKEND_PRIVATE_IP:5000/
    ProxyPassReverse /api/ http://BACKEND_PRIVATE_IP:5000/
</VirtualHost>
```

The workflow is identical to Nginx, just replace `nginx.conf` with `apache.conf`.

---

# Part 2: Deployment Workflows

## Frontend Deployment (Host Apache)

**File: `.github/workflows/deploy-frontend.yml`**

Deploys React static files directly to Apache's `/var/www/html`.

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build React App
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - name: Copy Build to Web Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.FRONTEND_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          source: "frontend/build/*"
          target: "/tmp/react-build"
          strip_components: 2

      - name: Copy Apache Config
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.FRONTEND_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          source: "frontend/apache.conf"
          target: "/tmp/apache.conf"

      - name: Setup Apache & Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.FRONTEND_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            # deploy static files
            sudo rm -rf /var/www/html/*
            sudo mv /tmp/react-build/* /var/www/html/
            
            # configure apache
            sudo mv /tmp/apache.conf /etc/apache2/sites-available/000-default.conf
            sudo sed -i "s/BACKEND_PRIVATE_IP/${{ secrets.BACKEND_PRIVATE_IP }}/g" /etc/apache2/sites-available/000-default.conf
            
            sudo systemctl restart apache2
```

---

# Part 3: Deploying the Backend

Now for the interesting part - deploying to a **private subnet** that we can't directly access from the internet.

## The SSH Jump Trick

Since we can't SSH directly to the private EC2, we go through the frontend:

```
GitHub Actions → Frontend EC2 → Backend EC2
                 (jump host)    (destination)
```

The `appleboy/scp-action` and `appleboy/ssh-action` both support this with `proxy_host` parameters.

---

## Option A: Standalone Docker (MongoDB Atlas)

Use this if your MongoDB is hosted on **MongoDB Atlas** (the cloud service).

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "index.js"]
```

---

## Docker Compose (Local MongoDB)

Use this if you want MongoDB running on the same server as the backend. This uses the official `mongo:6` image from Docker Hub.

### What is Docker Compose?

**Docker Compose** lets you define and run multiple containers together. Instead of running separate `docker run` commands, you describe everything in a YAML file.

### docker-compose.yml

```yaml
version: '3.8'

services:
  # Our Express backend
  backend:
    build: .                              # Build from Dockerfile in current dir
    container_name: backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URL=mongodb://mongo:27017/todos   # 'mongo' is the service name below
      - PORT=5000
    depends_on:
      - mongo                             # Wait for mongo to start first
    restart: unless-stopped

  # MongoDB database
  mongo:
    image: mongo:6                        # Official MongoDB image from Docker Hub
    container_name: mongodb
    volumes:
      - mongo_data:/data/db               # Persist data even if container restarts
    restart: unless-stopped

# Named volume for data persistence
volumes:
  mongo_data:
```

**Key Points:**
- `mongo:6` is the official MongoDB Docker image (version 6)
- The `mongo_data` volume ensures data isn't lost when containers restart
- Containers can reach each other by service name (`mongo` instead of IP address)

### Workflow

```yaml
name: Deploy Backend (Docker Compose)

on:
  push:
    branches: [main]
    paths: ['backend/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Copy to private EC2
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.BACKEND_PRIVATE_IP }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          proxy_host: ${{ secrets.FRONTEND_HOST }}
          proxy_username: ubuntu
          proxy_key: ${{ secrets.EC2_SSH_KEY }}
          source: "backend/*"
          target: "app"
          strip_components: 1

      - name: Deploy with Docker Compose
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.BACKEND_PRIVATE_IP }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          proxy_host: ${{ secrets.FRONTEND_HOST }}
          proxy_username: ubuntu
          proxy_key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd app
            
            # Stop old containers and start fresh
            sudo docker-compose down || true
            sudo docker-compose up -d --build
            
            echo " Backend + MongoDB deployed!"
```

---

# Part 4: Setting Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `EC2_SSH_KEY` | Content of your `.pem` file | Copy from `terraforms-key.pem` |
| `FRONTEND_HOST` | `54.xxx.xxx.xxx` | From Terraform output or AWS Console |
| `BACKEND_PRIVATE_IP` | `10.0.1.xxx` | From AWS Console (private IP) |
| `MONGODB_URL` | `mongodb+srv://...` | From MongoDB Atlas (if using) |

---

# Quick Reference: Which Setup to Choose?

| Your Situation | Frontend | Backend | Database |
|----------------|----------|---------|----------|
| Simple deployment, using MongoDB Atlas | Nginx or Apache | Standalone Docker | MongoDB Atlas |
| Want everything self-hosted | Nginx or Apache | Docker Compose | Local MongoDB |
| Want to minimize costs | Nginx | Docker Compose | Local MongoDB |

---

# Summary

Congratulations! You now understand how to:

1. Use **NAT Gateway** or **VPC Endpoints** for private subnet internet access
2. Deploy a React frontend with **Nginx** or **Apache**
3. Deploy an Express backend using **standalone Docker** or **Docker Compose**
4. Run MongoDB using either **Atlas** (cloud) or **local container** (`mongo:6` image)
5. Set up **GitHub Actions** for automated deployments
6. Use **SSH Jump** to deploy to private subnets

The key takeaway: **Keep sensitive services in private subnets**, and use the frontend as both a web server and a gateway to your backend.

Happy deploying! 
