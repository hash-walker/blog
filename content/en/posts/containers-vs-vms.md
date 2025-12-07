---
title = "Containers vs. Virtual Machines (VMs)"
date = 2025-12-07T14:21:30+05:00
draft = false
---

# Using Docker: The What, The Why, and The Architecture

> **Context:** This is part of my DevOps course. I was reading the book **"Using Docker: Developing and Deploying Software with Containers"** by *Adrian Mouat*.

## The "What" and "Why" of Containers

Containers are a way to distribute your software with the exact same environment within which it was developed. This makes it hassle-free to set up the environment on every different system where you want to run the software.

* **My favorite analogy:** For me, the best example I give to anybody is to **confine your software in a box**. This box contains the specific environment required for the software to run (we are discussing the libraries and dependencies here). When you transfer that box to another PC or laptop, the overall environment outside changes, but the environment *inside* the box stays exactly the same.

### Why do we need them?
Now here comes the question of *why* we need containers.

We have all said it: **"But it works on my machine!"**

We usually say this when we share code that works perfectly on our laptop but fails on a friend's machine. Most of the time, this is due to environmental differences—missing libraries, different versions, or configuration mismatches.

**Containers** actually solve this issue for you. You confine your code with the required libraries into a box, and you can then distribute it and run it anywhere.

---

## Containers vs. Virtual Machines (VMs)

At first glance, the definition of a **Container** looks similar to a **VM**. It looks like the Container is just a lightweight version of the VM, as the VM also works by isolating the environment from the Host OS.

However, **Containers** have significant advantages over VMs:

* **Efficiency:** Containers share the resources with the Host OS. You can start and stop containers in seconds, just like you start or stop an app on your computer.
* **Density:** Because they are lightweight, developers can run hundreds of containers at the same time, giving you the emulation of a distributed system on a single machine.

### The Architecture: A Visual Breakdown

This concept is explained best using diagrams to visualize the "stack."

#### 1. Virtual Machines (VMs)

![VM architecture](./journel_2025-12-06-figure-1.1.png)

**The Stack:** `Hardware → Host OS → Hypervisor → Guest OS → Bins/Libs → App`

* VMs use a **Hypervisor (Type 2)** <sup>1</sup> on top of the native operating system.
* A virtual machine is installed on top of that hypervisor, which gives you a separate kernel <sup>1</sup>, libraries, and a full operating system.
* In the image above, you can see the Hypervisor sitting on top of the Host OS, and then a **Guest OS** on top of that.

**The Overhead:**
Every VM uses its own resources because it runs a full Operating System and its own Kernel. This adds an additional layer: the VM kernel must communicate with the Hypervisor, the Hypervisor talks to the Host OS, and the Host OS talks to the hardware. This makes calls expensive, memory-intensive, and slow to boot.

#### 2. Containers

![Containers architecture](./journel_2025-12-06-figure-1.2.png)

**The Stack:** `Hardware → Host OS → Container Engine → Bins/Libs → App`

* Containers use a **Container Engine** on top of the Host OS.
* This acts somewhat like a hypervisor, but it **eliminates the overhead of the Guest OS**.
* It shares the resources of the Host OS, running like other standard processes on the operating system.

As you can see in the figure, if App Y and App Z use the same base libraries, they can share them, eliminating the need for redundant files on the same machine.

---

### Key Concepts

<sup>1</sup>: **Hypervisor (Type 2):** Think of this like a "Manager" app that sits between the Guest OS and the Host OS to exchange information.
    *(Note: There is also a Type 1 Hypervisor, which installs directly on the bare metal hardware, skipping the Host OS entirely, but that is mostly for servers.)*

<sup>2</sup>: **Kernel:** The core software that the Operating System uses to communicate between your applications and the physical hardware (CPU, Memory).