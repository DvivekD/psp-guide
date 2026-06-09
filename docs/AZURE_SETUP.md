# ☁️ Cloud / Azure Setup Guide

Hosting your PSP servers on the cloud means your PSP can stream video and music from **anywhere in the world** without needing your home PC to be turned on!

This guide uses **Microsoft Azure**, which offers $100 in free credits for students, plus free tier virtual machines.

## Prerequisites
- An Azure account (Students get $100 free credit at azure.microsoft.com/free/students).
- A basic understanding of copy-pasting terminal commands.

## Step 1: Create the Virtual Machine
1. Log into the Azure Portal.
2. Search for **Virtual Machines** and click **Create -> Azure virtual machine**.
3. **Basics:**
   - Resource group: Create a new one named `PSP-Cloud`
   - Virtual machine name: `psp-server`
   - Region: Pick the one closest to you geographically.
   - Image: Select **Ubuntu Server 22.04 LTS**.
   - Size: `Standard_B2ats_v2` (or `Standard_B1s` if you are using the generic Free Tier).
4. **Administrator Account:**
   - Authentication type: **Password**
   - Enter a username (e.g., `pspadmin`) and a strong password.
5. **Inbound Port Rules:**
   - Select **Allow selected ports** and choose **SSH (22)**.
6. Click **Review + create**, then **Create**.
7. Wait 2-3 minutes for the deployment to finish, then click **Go to resource**. Take note of the **Public IP address** shown on the page.

## Step 2: Open the Required Ports
Your server needs ports open for the PSP to talk to it.
1. On your VM's page in Azure, click **Networking** on the left sidebar.
2. Click **Add inbound port rule**.
3. Set the **Destination port ranges** to: `8081-8083`.
4. Change the **Protocol** to **TCP**.
5. Change the **Name** to `PSP-Ports` and click **Add**.

## Step 3: Connect to the Server
We will use Windows PowerShell (or Mac Terminal) to connect.
1. Open PowerShell on your computer.
2. Type the following command, replacing `IP_ADDRESS` with your server's Public IP:
   ```bash
   ssh pspadmin@IP_ADDRESS
   ```
3. Type `yes` if it asks about the fingerprint.
4. Enter your password (the characters won't show up on screen as you type, this is normal). Press Enter.

## Step 4: Run the One-Click Installer!
Once you are logged into your Ubuntu server, just paste this single command and press Enter:

```bash
git clone https://github.com/DvivekD/psp-guide.git && cd psp-guide/server && bash setup-azure.sh
```

The script will automatically:
- Install Node.js, Python, FFmpeg, and yt-dlp.
- Install and configure Cloudflare WARP (to prevent YouTube from blocking the server).
- Download the server files and install dependencies.
- Setup `PM2` so the servers run 24/7 and restart automatically if the server reboots.

Wait for the green **✓ AZURE SETUP COMPLETE!** message.

## Step 5: Configure your PSP
Now that the server is running, you just need to tell your PSP where to connect!

1. Connect your PSP to your computer via USB.
2. Download the `psp-guide` folder to your computer (Click Code -> Download ZIP on GitHub).
3. Extract the folder, open it, and go into the `psp` folder.
4. **Windows Users:** Double click `configure-psp.bat`.
   **Mac/Linux Users:** Open terminal and run `bash configure-psp.sh`.
5. The script will ask for your **Server IP**. Enter the Public IP address of your Azure VM.
6. It will automatically install the apps and configure the plugins!

Disconnect your PSP, open the GoTube app, and enjoy!
