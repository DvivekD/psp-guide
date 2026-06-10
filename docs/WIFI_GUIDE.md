# 📶 PSP Wi-Fi Connection Guide

Connecting a PSP to modern Wi-Fi can be tricky because the PSP's hardware is from 2004 and only natively supports **WPA** encryption (or WEP, which is highly insecure). Most modern routers default to **WPA2** or **WPA3**, which the PSP cannot see or connect to out-of-the-box.

Here are the best ways to get your PSP online today.

---

## Method 1: The WPA2 Plugin (Included in this Toolkit!) 🌟

If you ran our `configure-psp.bat/.sh` script, it automatically installed the `wpa2psp.prx` plugin to your PSP. 
This plugin modifies the PSP's network stack to understand **WPA2** networks!

**Requirements:**
- Your router must be broadcasting a **2.4 GHz** network (the PSP hardware physically lacks a 5 GHz antenna).
- Your router must use **WPA2 Personal** encryption (WPA3 will still fail).
- Your network password cannot contain special characters (letters and numbers only).

> **Important note for ARK-5 users:** If you are running ARK-5 (or any other modern CFW with built-in WPA2 support), your PSP can connect to WPA2 networks natively! **Do not install this plugin**, as it will conflict with your firmware and crash GoTube. If you can already connect to Wi-Fi successfully, say "yes" to skipping the plugin during the setup scripts.

**How to connect:**
1. Even with the plugin, your PSP will **not** see your WPA2 network when you click "Scan".
2. Go to **Network Settings** -> **Infrastructure Mode** -> **New Connection**.
3. Choose **Enter Manually**.
4. Type in the exact name (SSID) of your Wi-Fi network. Remember, it is case sensitive!
5. For WLAN Security Setting, choose **WPA-PSK (TKIP)**.
   *(Note: You must select TKIP on the PSP screen, even though your router is actually using WPA2-AES. The plugin tricks the PSP into handling the WPA2-AES connection in the background).*
6. Enter your Wi-Fi password.
7. Keep all other settings on "Easy" or "Automatic".
8. Test the connection. It should succeed!

---

## Method 2: Mobile Hotspot (Easiest Alternative)

If the plugin doesn't work for you (e.g., your home router uses WPA3 or combines 2.4/5GHz bands into one name), the easiest workaround is using your phone or PC as a hotspot.

### Android Hotspot
1. Go to Settings -> Network & Internet -> Hotspot & Tethering.
2. Tap **Wi-Fi hotspot**.
3. Set Security to **WPA2-Personal** (or "WPA/WPA2-Personal").
4. Set AP Band to **2.4 GHz band**.
5. Connect your PSP by scanning for the network and entering the password.

### Windows 10/11 Mobile Hotspot
1. Click the Start button -> Settings -> Network & Internet -> Mobile hotspot.
2. Turn it on.
3. Click **Edit** to change the properties.
4. Set the Network band to **2.4 GHz**.
5. Connect your PSP.

### iOS (iPhone) Personal Hotspot
*Unfortunately, modern iPhones broadcast hotspots in WPA3 or WPA2/WPA3 transition mode, which the PSP often fails to connect to even with the plugin. Use an Android or Windows device if possible, or try Method 3.*

---

## Method 3: Guest Network on your Router

Most modern routers allow you to create a "Guest Network" separate from your main Wi-Fi.

1. Log into your router's admin page (usually `192.168.1.1` or `10.0.0.1` in your browser).
2. Find the "Guest Network" settings.
3. Enable a new Guest Network.
4. Set it to broadcast on **2.4 GHz only**.
5. Set the security specifically to **WPA/WPA2-Personal (TKIP/AES)** or just **WPA**.
6. Connect your PSP to this new Guest Network.
