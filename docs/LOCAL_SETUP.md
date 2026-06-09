# 💻 Local PC Setup Guide

This guide will show you how to run the PSP Cloud Streaming servers directly on your own computer.

**Pros:** Completely free, uses your home internet speed.
**Cons:** Your PC must be turned on and connected to the same Wi-Fi network as the PSP whenever you want to stream.

## Step 1: Download the Toolkit
1. Click the **Code** button at the top of this GitHub repository and select **Download ZIP**.
2. Extract the ZIP file to your Desktop or a folder of your choice.

## Step 2: Run the Server Setup
### For Windows Users:
1. Open the extracted folder, go into the `server` folder, and double-click `setup-local.bat`.
2. The script will check if you have Node.js, Python, and FFmpeg installed. If you are missing any, it will give you download links. Install them, then run the script again.
3. The script will automatically detect your local IP address (e.g., `192.168.1.55`) and start 3 server windows.
4. **Important:** Keep these black command prompt windows open! If you close them, the server stops.

### For Mac/Linux Users:
1. Open your Terminal.
2. Navigate to the extracted folder: `cd ~/Downloads/psp-guide/server`
3. Run the installer: `bash setup-local.sh`
4. The script will offer to install missing dependencies via `brew` or `apt`.
5. Once complete, it will start the servers in the background.

## Step 3: Configure your PSP
Now that the server is running on your PC, you need to install the apps onto your PSP.

1. Connect your PSP to your computer via USB and put it in USB Mode.
2. Go back to the main `psp-guide` folder, and open the `psp` folder.
3. **Windows:** Double-click `configure-psp.bat`.
   **Mac/Linux:** Open terminal and run `bash configure-psp.sh`.
4. The script will automatically find your PSP drive.
5. It will ask for your **Server IP**. Enter the exact IP address that the server setup script gave you in Step 2.
6. The script will copy all the files and patch the IPs for you.

## Step 4: Stream!
1. Disconnect your PSP from USB.
2. Go to **Game -> Memory Stick** and open **GoTube**.
3. Use the **L and R triggers** to switch between YouTubeHQ, CloudMedia, and SpotiFlac.
4. Press **X** to search and play!

> **Note:** If you reboot your PC, your Local IP address might change. If your PSP stops connecting in the future, check your PC's IP address. If it changed, you will need to re-run the `configure-psp.bat` script to update the PSP.
