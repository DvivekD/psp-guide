# PSP Cloud Streaming Toolkit

Welcome to the **PSP Cloud Streaming** project! This toolkit allows you to transform your Sony PlayStation Portable into a modern streaming device, fully capable of playing YouTube, Movies, Anime, and lossless music directly over Wi-Fi.

This is a one-click automated setup designed specifically for beginners. You can host the backend servers on your own local PC (Windows/Mac/Linux) or deploy them to the cloud for 24/7 access (e.g., Azure).

## Features

- **YouTube HQ:** Watch YouTube natively on your PSP with searching, category browsing, and downscaled 1080p video.
- **CloudMedia:** Stream thousands of movies and anime episodes on demand, featuring a seamless resume system that remembers where you left off.
- **SpotiFLAC:** Stream high-quality lossless music, completely ad-free.
- **Zero Config Setup:** Our automated scripts detect your IP, configure the servers, and patch the PSP plugins automatically.

## Requirements

1. A **PSP** with Custom Firmware (CFW) installed. (See [CFW Guide](docs/CFW_GUIDE.md) if you are on official firmware).
2. A **WPA Wi-Fi** connection or a Mobile Hotspot. (See [Wi-Fi Guide](docs/WIFI_GUIDE.md) if you are having connection issues).
3. A **PC** (Windows, Mac, or Linux) to run the setup scripts.

## Installation Methods

You have two choices for where to run the backend servers.

### Method 1: Local PC (Easy)
Run the servers on your own computer. This is completely free, but your PC must remain powered on and connected to the same Wi-Fi network as your PSP while you stream.
➡️ **[Read the Local Setup Guide](docs/LOCAL_SETUP.md)**

### Method 2: Cloud / Azure (Recommended)
Run the servers on a free tier Cloud Virtual Machine (like Azure for Students). This means your PSP can connect from anywhere in the world, 24/7, without keeping your PC on.
➡️ **[Read the Azure Cloud Setup Guide](docs/AZURE_SETUP.md)**

## Frequently Asked Questions

**Q: Do I need a Memory Stick?**
A: Yes, you need enough space to install the GoTube application (less than 10MB). 

**Q: Will this brick my PSP?**
A: No. We are simply copying homebrew applications and text files to your memory stick. We do not touch the internal flash memory.

**Q: The video buffers a lot, what can I do?**
A: See our [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for tips on optimizing your Wi-Fi and server connection.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is a community-driven hobbyist project. It is not affiliated with Sony, Google, YouTube, or Spotify. 
