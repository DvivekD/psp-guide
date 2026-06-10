# 🛠️ Troubleshooting Guide

If you're having issues with PSP Cloud Streaming, check the solutions below.

### I can't connect my PSP to Wi-Fi
The PSP only has a 2.4GHz antenna and natively only supports WPA security. 
Please refer to our full **[Wi-Fi Connection Guide](WIFI_GUIDE.md)** for instructions on using the included WPA2 plugin, or setting up a mobile hotspot.

### GoTube freezes on "Resolving [YOUR SERVER IP]"
This means the PSP cannot reach your server. 
1. **Are you on the same network?** If you set up a Local server, your PSP and your PC *must* be connected to the exact same router/Wi-Fi. 
2. **Did your IP change?** Local IP addresses change if your router restarts or your PC reconnects. Check your PC's IP address again and re-run the `configure-psp` script if it changed.
3. **Is the Firewall blocking it?** On Windows, search for "Windows Defender Firewall", click "Turn Windows Defender Firewall on or off", and temporarily disable it for Private networks to see if it fixes the issue.
4. **Is the server running?** Check the terminal/command prompt window where the server is running. Does it say the server is listening?

### Video buffers constantly or stutters
1. **Wi-Fi Signal:** The PSP's Wi-Fi chip is very weak. You must be physically close to the router or hotspot.
2. **Server CPU:** The video is being actively transcoded (converted) by your server in real-time. If you are running the server on an old, slow PC, it may not be able to process the video fast enough. You need a decent CPU to transcode video smoothly.
3. **Try lower quality:** The CloudMedia app has a resolution limit in its backend. But for YouTubeHQ, you are streaming downscaled 1080p which is heavy. 

### SpotiFlac music skips or stops
Unlike video, SpotiFlac streams lossless audio which requires a constant, stable Wi-Fi connection without dropped packets.
1. Move closer to your router.
2. Ensure you don't have other heavy downloads running on the same network.
3. If using an Azure VM, the ping might be slightly too high. Try local hosting for flawless music streaming.

### "Not Supported Data" error on PSP
This usually happens if the server returns an error instead of a video file.
1. Look at your server console log. Is there a big red error message?
2. If YouTube returns this, YouTube might be temporarily blocking your server's IP address for scraping too much. Ensure you installed the Cloudflare WARP proxy mentioned in the setup scripts.

### I entered the wrong IP during setup
Simply run the `configure-psp.bat` (or `.sh`) script again and enter the correct IP. It will overwrite the old configuration automatically.

### GoTube crashes instantly on ARK-5 (returns to XMB)
If you're running **ARK-5** custom firmware and GoTube immediately kicks you back to the XMB without ever loading, the `wpa2psp.prx` plugin is conflicting with ARK-5's **built-in WPA2 support**.

ARK-5 already hooks the PSP's network kernel functions for WPA2. The `wpa2psp.prx` plugin tries to hook the same functions, causing a kernel conflict that crashes GoTube on launch.

**Fix:**
1. Connect your PSP via USB
2. Delete these two files from your memory stick:
   - `ms0:/seplugins/GAME.TXT`
   - `ms0:/seplugins/VSH.TXT`
3. Optionally delete `ms0:/seplugins/wpa2psp.prx` (it's not needed on ARK-5)
4. Reboot your PSP and try GoTube again

> **Note:** If you re-run the `configure-psp` script, answer **Y** when it asks if you're using ARK-5 to skip the plugin automatically.
