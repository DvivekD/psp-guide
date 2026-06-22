const fs = require('fs');

// Patch Spotiflac
let spoti = fs.readFileSync('/home/azureuser/spotiflac-backend/spotiflac-server_azure.js', 'utf8');
spoti = spoti.replace("const ffmpegArgs = [", "const ffmpegArgs = [\n        '-thread_queue_size', '512',");
spoti = spoti.replace("yt_proc.stdout.pipe(ffmpeg.stdin);", "yt_proc.stdout.pipe(ffmpeg.stdin);\n        ffmpeg.stdin.on('error', () => {});");
spoti = spoti.replace("ffmpeg.stdout.pipe(res);", "ffmpeg.stdout.pipe(res);\n        res.on('error', () => {});");
spoti = spoti.replace("ffmpeg.stdout.pipe(fileStream);", "ffmpeg.stdout.pipe(fileStream);\n        fileStream.on('error', () => {});");
fs.writeFileSync('/home/azureuser/spotiflac-backend/spotiflac-server_azure.js', spoti);

// Patch Cloud (Movies)
let cloud = fs.readFileSync('/home/azureuser/movies-backend/server-cloud.js', 'utf8');
cloud = cloud.replace("const torrent = client.add(magnetURI, { path: tempFolder });", "const torrent = client.add(magnetURI, { path: tempFolder });\n    if (!torrent || typeof torrent.on !== 'function') return res.status(500).json({ error: 'Failed to init torrent' });");
fs.writeFileSync('/home/azureuser/movies-backend/server-cloud.js', cloud);

// Patch Manga
let manga = fs.readFileSync('/home/azureuser/psp-manga-backend/manga-server.js', 'utf8');
manga = manga.replace("if (pages.length === 0) {", "if (!pages || pages.length === 0) {");
manga = manga.replace("for (let i = 0; i < activeSession.pages.length; i++) {", "if(!activeSession.pages) return;\n        for (let i = 0; i < activeSession.pages.length; i++) {");
fs.writeFileSync('/home/azureuser/psp-manga-backend/manga-server.js', manga);

console.log("Patching complete");
