# 🎮 PSP Custom Firmware (CFW) Guide

In order to run "Homebrew" applications like GoTube on your PSP, you must have Custom Firmware (CFW) installed. 

Don't worry, installing CFW in 2024 is incredibly easy, safe, and takes about 2 minutes. It does not permanently alter your console and can be uninstalled easily.

## Step 1: Check your current firmware
1. Turn on your PSP.
2. Go to **Settings** -> **System Settings** -> **System Information**.
3. Look at your **System Software** version. 
4. If it says `6.61 PRO-C`, `6.60 PRO-C`, `6.61 ME`, or `infinity`, you already have CFW and can skip this entire guide!
   *(Note: This toolkit has been thoroughly **tested and verified on 6.60 PRO-C Infinity**).*
5. If it says `6.61` without any letters, proceed to Step 2.
6. If it is lower than `6.61` (e.g. `6.60`), you should update to the official 6.61 firmware first using the Network Update feature or via a USB drive.

> **Using ARK-5 or a modern CFW?**
> Some modern firmwares like ARK-5 have **built-in WPA2 Wi-Fi support**. If your PSP can already connect to your WPA2 Wi-Fi network, you can safely **skip the Wi-Fi plugin (wpa2psp.prx)** during the `configure-psp` setup script, as installing it on top of native WPA2 can cause crashes.

## Step 2: Download PRO-C CFW
1. Download the `6.61 PRO-C2` custom firmware files online (search for "PSP 6.61 PRO-C2 download" on Google or Wololo.net).
2. Extract the downloaded ZIP file.

## Step 3: Copy to PSP
1. Connect your PSP to your computer via USB.
2. Open your PSP's memory stick drive on your computer.
3. Open the `PSP` folder, then open the `GAME` folder.
4. Copy the `PROUPDATE` and `FastRecovery` folders from the extracted ZIP file into your PSP's `GAME` folder.

## Step 4: Install!
1. Disconnect your PSP from USB.
2. Go to **Game** -> **Memory Stick**.
3. Launch the **PRO Update** application.
4. The screen will go black and show some text. Press **X** to install.
5. When it says it is finished, press **X** again to reboot.
6. Your PSP is now running Custom Firmware!

> **Note for Non-Permanent CFW:** 
> Unless you install the Infinity patch, your PSP will revert to official firmware every time you completely turn it off (holding the power button up) or the battery dies. If this happens, simply go to Game -> Memory Stick and run the **Fast Recovery** app. It takes 3 seconds and puts you back into CFW mode.
