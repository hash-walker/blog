---
title: "AWS Networking Guide"
date: 2025-12-29T12:30:30+05:00
draft: false
---

# Mastering AWS Networking Basics for Programmers: A Hands-On Guide

For many programmers transitioning into cloud computing, networking concepts like VPCs, subnets, and route tables can seem daunting. This guide, inspired by Travis Media's practical tutorial, breaks down the essentials of AWS networking, providing a hands-on approach to building a common network architecture.

By the end of this guide, you will have a solid understanding of how these components work together.

---

## 1. Understanding and Creating Your AWS VPC

The foundation of your AWS network is the **Virtual Private Cloud (VPC)**. Think of a VPC as your own isolated virtual network within the AWS Cloud. It provides a private space where you can launch your AWS resources without interference from other AWS customers.

### CIDR Ranges Explained
A crucial aspect of VPCs is understanding **CIDR (Classless Inter-Domain Routing)** ranges. This defines the IP address space for your VPC.
* **/24 suffix**: Allows you to change the last number of the IP address (e.g., `10.0.0.1` to `10.0.0.254`).
* **/16 suffix**: Allows changes to the last two numbers (e.g., `10.0.0.1` to `10.0.255.254`).
* **/8 suffix**: Allows changes to the last three numbers.

### Steps to Create a VPC
1.  Navigate to the **VPC service** in the AWS console.
2.  Click **Create VPC**.
3.  Choose **VPC only**.
4.  **Name tag**: `my-new-vpc`
5.  **IPv4 CIDR block**: `10.0.0.0/16` (This gives you a large address space to work with).
6.  Click **Create VPC**.

---

## 2. Segmenting Your Network with Subnets

Within your VPC, you define **subnets**. Subnets are distinct segments of your VPC's IP address range that allow you to isolate resources for security and organization.

* **Public Subnets**: For resources that need direct internet access (e.g., web servers).
* **Private Subnets**: For resources that should not be directly accessible from the internet (e.g., databases).

### Steps to Create Subnets
1.  In the VPC dashboard, click on **Subnets**.
2.  Click **Create subnet**.
3.  **VPC ID**: Select `my-new-vpc`.

**Create Public Subnet:**
* **Subnet name**: `public-subnet`
* **Availability Zone**: `us-east-1a` (or your preference)
* **IPv4 CIDR block**: `10.0.0.0/24`
* Click **Add new subnet**.

**Create Private Subnet:**
* **Subnet name**: `private-subnet`
* **Availability Zone**: `us-east-1a`
* **IPv4 CIDR block**: `10.0.1.0/24`
* Click **Create subnet**.

---

## 3. Launching a Public EC2 Instance

An **EC2 instance** is a virtual server in the cloud. We'll launch one into our public subnet to serve as a publicly accessible resource.

### Steps to Launch
1.  Navigate to the **EC2 service** and click **Launch instances**.
2.  **Name**: `my-public-instance`
3.  **AMI**: Select **Amazon Linux** (Free tier eligible).
4.  **Instance type**: `t2.micro` (Free tier eligible).
5.  **Key pair**: Choose an existing key pair or Create new key pair.
6.  **Network settings** (Click Edit):
    * **VPC**: Select `my-new-vpc`.
    * **Subnet**: Select `public-subnet`.
    * **Auto-assign Public IP**: **Enable** (Crucial for public access).
7.  **Firewall (security groups)**: Create security group.
    * **Name**: `SG-public`
    * **Description**: Allow SSH from anywhere.
    * **Inbound rules**: Type: `SSH`, Source: `Anywhere (0.0.0.0/0)`.
8.  Click **Launch instance**.

*Note: Initially, you won't be able to connect to this instance because your VPC is still isolated.*

---

## 4. Enabling Internet Access with an Internet Gateway

An **Internet Gateway (IGW)** acts as the door between your VPC and the internet. It is highly available and redundant.

### Steps to Create and Attach
1.  In the VPC dashboard, click on **Internet Gateways**.
2.  Click **Create internet gateway**.
3.  **Name tag**: `my-internet-gateway` and click Create.
4.  Select the new IGW, go to **Actions -> Attach to VPC**.
5.  Select `my-new-vpc` and click **Attach internet gateway**.

---

## 5. Directing Traffic with Route Tables

**Route tables** contain rules that determine where network traffic from your subnets is directed. You need to tell your public subnet how to find the Internet Gateway.

### Steps to Create Route Tables
1.  In the VPC dashboard, click on **Route Tables**.
2.  **Create Public Route Table**:
    * **Name**: `public-route-table`
    * **VPC**: `my-new-vpc`
3.  **Create Private Route Table**:
    * **Name**: `private-route-table`
    * **VPC**: `my-new-vpc`

### Associate Subnets
1.  Select `public-route-table` -> **Subnet associations** tab -> **Edit subnet associations**.
    * Select `public-subnet` and save.
2.  Select `private-route-table` -> **Subnet associations** tab -> **Edit subnet associations**.
    * Select `private-subnet` and save.

### Add Route to Internet Gateway (Public Only)
1.  Select `public-route-table` -> **Routes** tab -> **Edit routes**.
2.  Click **Add route**.
    * **Destination**: `0.0.0.0/0` (All traffic outside the VPC).
    * **Target**: Select `Internet Gateway` -> `my-internet-gateway`.
3.  Click **Save changes**.

*You should now be able to SSH into your public EC2 instance!*

---

## 6. Launching a Private EC2 Instance

This instance will reside in our private subnet and will **not** be directly accessible from the internet.

### Steps to Launch
1.  Navigate to EC2 -> **Launch instances**.
2.  **Name**: `my-private-instance`
3.  **AMI/Instance Type**: Amazon Linux / t2.micro.
4.  **Key pair**: Choose the **same key pair** as your public instance.
5.  **Network settings**:
    * **VPC**: `my-new-vpc`
    * **Subnet**: `private-subnet`
    * **Auto-assign Public IP**: **Disable** (Crucial for privacy).
6.  **Firewall (security groups)**: Create security group.
    * **Name**: `SG-private`
    * **Description**: Allow SSH from public instance.
    * **Inbound rules**: Type: `SSH`, Source type: **Custom** -> Select `SG-public`.
7.  Click **Launch instance**.

---

## 7. SSHing into the Private EC2 Instance (via Public EC2)

Since the private instance has no public IP, you must use your public instance as a **Bastion Host** (jump box).

### Required Commands

**1. Copy your Key Pair to the Public Instance**
Run this command on your **local machine**.
```bash
# Replace paths and IP with your actual details
sudo scp -i ~/path/to/your/keypair.pem ~/path/to/your/keypair.pem ec2-user@YOUR_PUBLIC_IP:/home/ec2-user/

Since the private instance has no public IP, you must use your public instance as a **Bastion Host** (jump box).
```
### Required Commands

**1. Copy your Key Pair to the Public Instance**
Run this command on your **local machine**.

```bash
# Replace paths and IP with your actual details
sudo scp -i ~/path/to/your/keypair.pem ~/path/to/your/keypair.pem ec2-user@YOUR_PUBLIC_IP:/home/ec2-user/
```

**2. SSH into the Public Instance**
Run this on your **local machine**.

```bash
ssh -i ~/path/to/your/keypair.pem ec2-user@YOUR_PUBLIC_IP
```

**3. SSH into the Private Instance**
Run this **inside your public instance**.

```bash
# Use the private IP of your private instance
ssh -i keypair.pem ec2-user@YOUR_PRIVATE_IP
```

*Note: If you try to run `sudo yum update -y` on the private instance now, it will fail because it has no route to the internet.*

---

## 8. Enabling Outbound Internet Access with NAT Gateway

A **NAT (Network Address Translation) Gateway** allows private instances to connect *out* to the internet (for updates) but prevents the internet from initiating connections *in*.

### Steps to Create NAT Gateway

1. In the VPC dashboard, click on **NAT Gateways**.
2. Click **Create NAT gateway**.
3. **Name**: `my-nat-gateway`
4. **Subnet**: Select `public-subnet` (It must live in the public subnet!).
5. **Connectivity type**: Public.
6. **Elastic IP allocation**: Click **Allocate Elastic IP address**.
7. Click **Create NAT gateway**.

### Add Route for Private Subnet

1. Go to **Route Tables** → Select `private-route-table`.
2. **Routes** tab → **Edit routes** → **Add route**.
3. **Destination**: `0.0.0.0/0`
4. **Target**: Select **NAT Gateway** → `my-nat-gateway`.
5. Click **Save changes**.

*Now, `sudo yum update -y` on your private instance should work!*

---

## 9. NACLs and Security Groups

### Network Access Control Lists (NACLs)

* Act as a **virtual firewall for your subnets**.
* **Stateless**: If you allow inbound traffic, you must explicitly allow outbound traffic too.
* Commonly used to block specific IP addresses.

### Security Groups

* Act as a **virtual firewall for your EC2 instances**.
* **Stateful**: If you allow inbound traffic, the response is automatically allowed out.
* Every EC2 instance must have at least one.

---

## Conclusion

By following these steps, you've built a foundational AWS network with public and private subnets, internet access for public resources, and controlled outbound internet access for private resources. Understanding these core components is essential for any programmer looking to work effectively in the cloud.
