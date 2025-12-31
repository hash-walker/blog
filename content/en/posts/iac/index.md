---
title: "Hands-On IaC with Terraforms"
date: 2025-12-30T14:21:30+05:00
draft: false
---

# Hands-On Infrastructure Deployment with Terraform: A Practice Guide

Infrastructure as Code (IaC) has revolutionized how we provision and manage cloud resources. Instead of clicking through consoles, we can define our entire infrastructure in human-readable configuration files. In this practice project, we’ll walk through a hands-on guide to deploy a secure, scalable web application architecture on AWS using **Terraform**.

We will build a **Virtual Private Cloud (VPC)** with public and private subnets, deploy **EC2 instances** for a web server and a backend service, configure **Security Groups**, and manage **IAM users**—all via code.

By the end of this guide, you will have a fully functioning infrastructure deployed on AWS to use as a sandbox for your learning.

## Prerequisites

Before we start, ensure you have:
1.  **Terraform installed** on your local machine.
2.  **AWS CLI configured** with your credentials (`aws configure`).

## Project Structure

We will organize our Terraform configuration into modular files. This is a best practice that keeps our code clean and manageable.

Create a directory for your project (e.g., `terraform-practice`) and let's start creating files one by one.

## Step 1: Providers (providers.tf)

First, we need to tell Terraform which cloud provider we're using. We'll use the AWS provider. We also include the `tls` and `local` providers for key generation.

**Create `providers.tf`:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# Provider Block

provider "aws" {
    profile = "default"
    region = "us-east-1"
}
```

## Step 2: Variables (variables.tf)

We use variables to make our configuration reusable and flexible.

**Create `variables.tf`:**

```hcl
variable "ec2_instance_type" {
    description = "AWS ec2 instance type"
    type = string 
    default = "t3.micro"
}

variable "vpc_name" {
    description = "Name of the VPC"
    type = string 
    default = "my-vpc"
}

variable "vpc_cidr" {
    description = "vpc cidr"
    type = string 
    default = "10.0.0.0/16"
}

variable "public_subnet_name_1" {
    description = "public subnet 1"
    type = string 
    default = "public-subnet-1"
}

variable "public_subnet_cidr_1" {
    description = "public subnet cidr 1"
    type = string 
    default = "10.0.0.0/24"
}

variable "private_subnet_name_1" {
    description = "private subnet 1"
    type = string 
    default = "private-subnet-1"
}

variable "private_subnet_cidr_1" {
    description = "private subnet cidr 1"
    type = string 
    default = "10.0.1.0/24"
}

variable "public_subnet_name_2" {
    description = "public subnet 2"
    type = string 
    default = "public-subnet-2"
}

variable "public_subnet_cidr_2" {
    description = "public subnet cidr 2"
    type = string 
    default = "10.0.2.0/24"
}

variable "private_subnet_name_2" {
    description = "private subnet 2"
    type = string 
    default = "privates-subnet-2"
}

variable "private_subnet_cidr_2" {
    description = "private subnet cidr 2"
    type = string 
    default = "10.0.3.0/24"
}

variable "internet_gw" {
    description = "internet gateway"
    type = string 
    default = "terraforms_gw"
}

variable "ec2_ami" {
    description = "EC2 ubuntu ami"
    type = string 
    default = "ami-0ecb62995f68bb549"
}

variable "ec2_frontend_1_name" {
    description = "EC2 frontend in zone 1"
    type = string 
    default = "ec2_frontend_1"
}

variable "ec2_backend_1_name" {
    description = "EC2 backend in zone 1"
    type = string 
    default = "ec2_backend_1"
}
```

## Step 3: The Network - VPC (vpc.tf)

We create a VPC and an Internet Gateway to allow our public instances to talk to the internet.

**Create `vpc.tf`:**

```hcl
# vpc 
resource "aws_vpc" "my-vpc" {
  cidr_block = var.vpc_cidr

  tags = {
    name = var.vpc_name
  }
}

# internet gateway 

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.my-vpc.id

  tags = {
    Name = var.internet_gw
  }
}
```

## Step 4: Subnets & Routing (subnets.tf)

We define our public and private subnets and configure Route Tables. We associate the public subnets with a Route Table that points to the Internet Gateway.

**Create `subnets.tf`:**

```hcl
# public subnet 1

resource "aws_subnet" "public_subnet_1" {
  vpc_id     = aws_vpc.my-vpc.id
  cidr_block = var.public_subnet_cidr_1
  availability_zone = "us-east-1a"

  tags = {
    Name = var.public_subnet_name_1
  }
}

# private subnet 1

resource "aws_subnet" "private_subnet_1" {
  vpc_id     = aws_vpc.my-vpc.id
  cidr_block = var.private_subnet_cidr_1
  availability_zone = "us-east-1a"

  tags = {
    Name = var.private_subnet_name_1
  }
}


# public subnet 2

resource "aws_subnet" "public_subnet_2" {
  vpc_id     = aws_vpc.my-vpc.id
  cidr_block = var.public_subnet_cidr_2
  availability_zone = "us-east-1b"

  tags = {
    Name = var.public_subnet_name_2
  }
}

# private subnet 

resource "aws_subnet" "private_subnet_2" {
  vpc_id     = aws_vpc.my-vpc.id
  cidr_block = var.private_subnet_cidr_2
  availability_zone = "us-east-1b"

  tags = {
    Name = var.private_subnet_name_2
  }
}

# rotue tables public 1 and 2

resource "aws_route_table" "public_RT_1" {
  vpc_id = aws_vpc.my-vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "public_RT_1"
  }
}

resource "aws_route_table" "public_RT_2" {
  vpc_id = aws_vpc.my-vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "public_RT_2"
  }
}

# public subnet association

resource "aws_route_table_association" "public_subnet_assoc_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_RT_1.id
}

resource "aws_route_table_association" "public_subnet_assoc_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_RT_2.id
}


# route tables private 1 and 2

resource "aws_route_table" "private_RT_1" {
  vpc_id = aws_vpc.my-vpc.id

  tags = {
    Name = "private_RT_1"
  }
}

resource "aws_route_table" "private_RT_2" {
  vpc_id = aws_vpc.my-vpc.id

  tags = {
    Name = "private_RT_2"
  }
}

# private subnet association

resource "aws_route_table_association" "private_subnet_assoc_1" {
  subnet_id      = aws_subnet.private_subnet_1.id
  route_table_id = aws_route_table.private_RT_1.id
}

resource "aws_route_table_association" "private_subnet_assoc_2" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_RT_2.id
}
```

## Step 5: Security Groups (security_groups.tf)

We create two security groups:
- `web_sg`: Allows HTTP (80) and SSH (22) from anywhere.
- `db_sg`: Allows SSH (22) and MySQL (3306) **only** from the `web_sg`. This secures the internal instance.

**Create `security_groups.tf`:**

```hcl
# security groups 

resource "aws_security_group" "web_sg" {
    name = "web_sg"
    description = "allow traffic from anywhere to the website"
    vpc_id = aws_vpc.my-vpc.id

    # inbound: ssh from anywhere

    ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    # inbound: HTTP (80) from anywhere

    ingress {
        from_port = 80
        to_port = 80
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    # Outbound: all traffic allowed

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        name = "terraforms-Public-SG"
    }
}

resource "aws_security_group" "db_sg" {
    name = "db_sg"
    description = "allow traffic from  the website only"
    vpc_id = aws_vpc.my-vpc.id

    # inbound: ssh from anywhere

    ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        security_groups = [aws_security_group.web_sg.id]
    }

    # inbound: HTTP (80) from anywhere

    ingress {
        from_port = 3306
        to_port = 3306
        protocol = "tcp"
        security_groups = [aws_security_group.web_sg.id]
    }

    # Outbound: all traffic allowed

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        name = "terraforms-Private-SG"
    }
}
```

## nat_gateway.tf

NAT Gateway allows instances in private subnets to access the internet for outbound traffic (like downloading Docker images, npm packages) while remaining inaccessible from the internet.

```hcl
# --- NAT Gateway for AZ 1 ---

# Elastic IP for NAT Gateway
resource "aws_eip" "nat_1" {
  domain = "vpc"

  tags = {
    Name = "NAT-EIP-AZ1"
  }
}

# NAT Gateway in public subnet
resource "aws_nat_gateway" "nat_1" {
  allocation_id = aws_eip.nat_1.id
  subnet_id     = aws_subnet.public_subnet_1.id

  tags = {
    Name = "NAT-Gateway-AZ1"
  }

  depends_on = [aws_internet_gateway.gw]
}

# --- NAT Gateway for AZ 2 (Optional - for high availability) ---

resource "aws_eip" "nat_2" {
  domain = "vpc"

  tags = {
    Name = "NAT-EIP-AZ2"
  }
}

resource "aws_nat_gateway" "nat_2" {
  allocation_id = aws_eip.nat_2.id
  subnet_id     = aws_subnet.public_subnet_2.id

  tags = {
    Name = "NAT-Gateway-AZ2"
  }

  depends_on = [aws_internet_gateway.gw]
}
```

**Key Points:**
- **Elastic IP**: Static public IP assigned to NAT Gateway
- **Location**: NAT Gateway must be in a **public subnet**
- **Cost**: ~$32/month per NAT Gateway + data processing charges

---

## Private Route Tables with NAT

Update the private route tables to route internet traffic through the NAT Gateway:

```hcl
# route tables private 1 - with NAT Gateway route
resource "aws_route_table" "private_RT_1" {
  vpc_id = aws_vpc.my-vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_1.id
  }

  tags = {
    Name = "private_RT_1"
  }
}

resource "aws_route_table" "private_RT_2" {
  vpc_id = aws_vpc.my-vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_2.id
  }

  tags = {
    Name = "private_RT_2"
  }
}
```

**Traffic Flow with NAT Gateway:**
```
Private EC2 → Private Route Table → NAT Gateway → Internet Gateway → Internet
     ↑                                    ↓
     └──────────── Response ──────────────┘
```

---

## Step 6: IAM User (iam.tf)

We create an IAM user with AdministratorAccess and generate credentials.

**Create `iam.tf`:**

```hcl
resource "aws_iam_user" "assignment_user" {
    name = "terraform_practice_admin"

    tags = {
        Description = "Admin user for Terraform Practice Project"
    }
}

resource "aws_iam_user_policy_attachment" "admin_attach" {
  user        = aws_iam_user.assignment_user.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_access_key" "assignment_key" {
    user = aws_iam_user.assignment_user.name
}
```

## Step 7: SSH Key Pair (key_pair.tf)

We generate an RSA key pair using Terraform and save the private key locally as `terraforms-key.pem`.

**Create `key_pair.tf`:**

```hcl
# generating key pairs 

resource "tls_private_key" "terraforms_key" {
    algorithm = "RSA"
    rsa_bits = 4096
}

resource "aws_key_pair" "terraforms_key" {
  key_name   = "terraforms-key"
  public_key = tls_private_key.terraforms_key.public_key_openssh
}

resource "local_file" "ssh_key" {
    filename = "${path.module}/terraforms-key.pem"
    content = tls_private_key.terraforms_key.private_key_pem
    file_permission = "0400"
}
```

## Step 8: EC2 Instances (instances.tf)

We launch two instances using Ubuntu:
1.  **Web Server (`ec2_web_1`):** In a public subnet. It runs a user_data script to install Nginx and serve a "Hello" page.
2.  **Private Server (`ec2_private_1`):** In a private subnet. It runs a user_data script to install MySQL.

**Create `instances.tf`:**

```hcl
# create EC2 instance for web 1 and web 2

resource "aws_instance" "ec2_web_1" {
  ami           = var.ec2_ami
  instance_type = var.ec2_instance_type

  subnet_id                   = aws_subnet.public_subnet_1.id
  vpc_security_group_ids      = [aws_security_group.web_sg.id]
  associate_public_ip_address = true

  key_name = aws_key_pair.terraforms_key.key_name

  # --- WEB SERVER 1 ---
  user_data = <<-EOF
    #!/bin/bash
    
    # --- WEB SERVER (Apache) ---
    # Requirement: "configure one for hosting a simple web server such as Apache"
    apt-get update -y
    apt-get install apache2 -y
    
    # Enable necessary modules for proxying to backend
    a2enmod proxy
    a2enmod proxy_http
    a2enmod rewrite
    
    systemctl enable apache2
    systemctl start apache2
    
    # Allow ubuntu user to write to web dir (for deployment)
    chown -R ubuntu:ubuntu /var/www/html
    chmod -R 755 /var/www/html
    EOF

  tags = {
    Name = var.ec2_frontend_1_name
  }
}

resource "aws_instance" "ec2_private_1" {
  ami           = var.ec2_ami
  instance_type = var.ec2_instance_type

  subnet_id                   = aws_subnet.private_subnet_1.id
  vpc_security_group_ids      = [aws_security_group.db_sg.id]
  associate_public_ip_address = false

  key_name = aws_key_pair.terraforms_key.key_name

  user_data = <<-EOF
    # --- DATABASE/ ML MODEL INSTANCE ---
    # Requirement: "deploying a database instance or a simple machine learning model"
    # We use Docker to run MongoDB (Database) and Express (Model/API)
    apt-get update -y
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker ubuntu
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    systemctl enable docker
    systemctl start docker
    EOF

  tags = {
    Name = var.ec2_backend_1_name
  }
}

```

## Step 9: Outputs (outputs.tf)

We output the IAM credentials and the Web Server's public IP.

**Create `outputs.tf`:**

```hcl
output "access_key_id" {
    value = aws_iam_access_key.assignment_key.id
}

output "secret_access_key" {
    value = aws_iam_access_key.assignment_key.secret
    sensitive = true
}

output "web_server_public_ip" {
    value = aws_instance.ec2_web_1.public_ip
}
```

## Deploying the Infrastructure

Now that we have all our files, it's time to launch!

1.  **Initialize Terraform:**
    ```bash
    terraform init
    ```
2.  **Plan:** See what will be created.
    ```bash
    terraform plan
    ```
3.  **Apply:** Create the resources.
    ```bash
    terraform apply -auto-approve
    ```
4.  **Verify:** Check the outputted IP in your browser to see Nginx running!

## Validation

After running `terraform apply`, you can:
- Visit `http://<web_server_public_ip>` to see the "Hello from Web Server 1" page.
- SSH into the web instance using the generated key:
  ```bash
  chmod 400 terraforms-key.pem
  ssh -i terraforms-key.pem ubuntu@<web_server_public_ip>
  ```

---

You have now successfully deployed a modular, code-managed infrastructure!
