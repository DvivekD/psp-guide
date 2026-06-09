const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const { SocksProxyAgent } = require('socks-proxy-agent');
const app = express();

const configPath = path.join(__dirname, 'config.json');
let config = { BACKEND_IP: '127.0.0.1', PORT: 8083, PROXY_URL: 'socks5://127.0.0.1:40000' };
if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}
const port = config.PORT;
const proxyAgent = new SocksProxyAgent(config.PROXY_URL);

const activeTranscodes = new Set();
const cacheDir = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

// Global crash protection
process.on('uncaughtException', (err) => console.error('[UncaughtException]', err));
process.on('unhandledRejection', (reason) => console.error('[UnhandledRejection]', reason));

// Global socket error swallowing
app.use((req, res, next) => {
    if (req.socket && req.socket.listenerCount('error') === 0) {
        req.socket.on('error', () => {});
    }
    next();
});

// Clean up old caches periodically
function cleanupCache() {
    try {
        fs.readdirSync(cacheDir).forEach(file => {
            if (!file.endsWith('.flv')) return;
            const p = path.join(cacheDir, file);
            const stats = fs.statSync(p);
            // Delete if older than 2 hours or size = 0
            if (Date.now() - stats.mtimeMs > 2 * 60 * 60 * 1000 || stats.size === 0) { 
                fs.unlinkSync(p);
            }
        });
    } catch(e) {}
}
setInterval(cleanupCache, 600000); // every 10 mins

app.get('/proxy_image', (req, res) => {
    try {
        const url = req.query.url;
        require('https').get(url, (response) => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
                res.setHeader('Content-Length', buffer.length);
                res.send(buffer);
            });
        }).on('error', () => res.status(500).end());
    } catch(e) {
        res.status(500).end();
    }
});

const thumbnailCache = {}; // Cache to prevent PSP URL buffer overflows

async function handleSearch(query, page, res) {
    try {
        var queryType = 'song';
        var cleanQuery = query;
        
        if (query.startsWith('@')) {
            queryType = 'album';
            cleanQuery = query.substring(1).trim();
        } else if (query.startsWith('!')) {
            queryType = 'playlist';
            cleanQuery = query.substring(1).trim();
        }
        
        console.log(`[SEARCH] Query Type: ${queryType} | Query: ${cleanQuery}`);
        
        const pyArgs = ['python3', path.join(__dirname, 'ytm_search.py'), queryType, cleanQuery];
        const child = spawn(pyArgs[0], pyArgs.slice(1));
        
        let stdoutData = '';
        child.stdout.on('data', chunk => stdoutData += chunk);
        child.on('close', code => {
            if (code !== 0) return res.status(500).send('Error searching');
            try {
                const entries = JSON.parse(stdoutData);
                entries.forEach(entry => {
                    if (entry.id && entry.image) thumbnailCache[entry.id] = entry.image;
                });
                const results = entries.map(entry => ({
                    id: entry.id,
                    url: entry.id,
                    title: entry.title + ' - ' + (entry.album || ''),
                    uploader: 'Artist',
                    duration_string: Math.floor(entry.duration / 60) + ':' + (entry.duration % 60).toString().padStart(2, '0'),
                    thumbnail: entry.image || 'https://i.imgur.com/4N3a3gH.png'
                }));
                res.json(results);
            } catch (e) {
                res.status(500).send('Error searching');
            }
        });
    } catch (err) {
        console.error(`[SEARCH ERROR]`, err);
        res.status(500).json([]);
    }
}

app.get('/search', async (req, res) => {
    var query = req.query.q || 'lofi hip hop';
    var page = req.query.page || 1;
    handleSearch(query, page, res);
});

app.get('/voice-search', (req, res) => {
    const voiceFilePath = '/tmp/psp_voice.txt';
    if (fs.existsSync(voiceFilePath)) {
        const query = fs.readFileSync(voiceFilePath, 'utf8').trim();
        fs.unlinkSync(voiceFilePath); // Clear the command after reading
        if (query) {
            console.log(`[VOICE-SEARCH] Detected spoken command: ${query}`);
            var page = req.query.page || 1;
            return handleSearch(query, page, res);
        }
    }
    
    // If no voice command found, return empty JSON array
    console.log(`[VOICE-SEARCH] No voice command found in /tmp/psp_voice.txt`);
    res.json([]);
});

// Raw text endpoint for CloudMedia and YouTubeHQ
app.get('/get-voice', (req, res) => {
    const voiceFilePath = '/tmp/psp_voice.txt';
    if (fs.existsSync(voiceFilePath)) {
        const query = fs.readFileSync(voiceFilePath, 'utf8').trim();
        fs.unlinkSync(voiceFilePath);
        console.log(`[VOICE-BRIDGE] Consumed voice command via raw text: "${query}"`);
        return res.type('text/plain').send(query);
    }
    console.log(`[VOICE-BRIDGE] No voice command available for raw fetch`);
    res.type('text/plain').send('ERROR');
});

// Endpoint for Apple Shortcuts / Apple Watch to post spoken text
app.get('/speak', (req, res) => {
    const query = req.query.q || '';
    if (!query) {
        return res.status(400).send('No query provided');
    }
    
    // Save to tmp file
    fs.writeFileSync('/tmp/psp_voice.txt', query.trim(), 'utf8');
    console.log(`[VOICE-BRIDGE] Saved voice query: "${query}"`);
    
    // Return a simple success page or text
    res.send(`Successfully saved voice command: ${query}`);
});

app.get('/get_stream_link', (req, res) => {
    const url = req.query.id;
    console.log(`[GET_STREAM] Fetching direct link for: ${url}`);
    const direct_link = `http://${config.BACKEND_IP}:${config.PORT}/stream?id=${encodeURIComponent(url)}`;
    res.send(direct_link);
});

app.get('/stream', async (req, res) => {
    let url = req.query.id;
        
    let thumbUrlFromSearch = null;
    if (url.includes('|||')) {
        const parts = url.split('|||');
        url = parts[0];
        thumbUrlFromSearch = parts[1];
    } else if (thumbnailCache[url]) {
        thumbUrlFromSearch = thumbnailCache[url];
    }
    
    const safeId = url.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    url = 'https://music.youtube.com/watch?v=' + url;

    console.log(`[STREAM] Request for: ${url}`);

    // 1. Check disk cache first (Zero CPU replay)
    const cachePath = path.join(cacheDir, `${safeId}.flv`);
    if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 1000000) { // >1MB
        console.log(`[STREAM] Serving from cache: ${cachePath}`);
        res.setHeader("Content-Type", "video/x-flv");
        res.setHeader("Connection", "close");
        const stream = fs.createReadStream(cachePath);
        stream.pipe(res);
        return;
    }

    if (activeTranscodes.size >= 3) {
        console.log(`[STREAM] Server busy, active transcodes: ${activeTranscodes.size}`);
        return res.status(503).send('Server busy');
    }
    activeTranscodes.add(safeId);

    try {
        res.setHeader("Content-Type", "video/x-flv");
        res.setHeader("Connection", "close");

        // 2. Resolve thumbnail
        let thumbUrl = thumbUrlFromSearch;
        let thumbPath = `/tmp/sc_thumb_${safeId}.jpg`;
        let videoId = url.split('v=')[1];
        if (videoId) {
            videoId = videoId.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 11);
        }
        
        if (!thumbUrlFromSearch && videoId) {
            try {
                const info = await ytdl.getInfo(videoId, { requestOptions: { agent: proxyAgent } });
                const thumbnails = info.videoDetails.thumbnails;
                if (thumbnails && thumbnails.length > 0) {
                    thumbUrlFromSearch = thumbnails[thumbnails.length - 1].url.split('?')[0];
                }
            } catch(e) {
                console.error("Fallback thumbnail fetch failed", e);
            }
        }
        thumbUrl = thumbUrlFromSearch || (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null);
        
        if (thumbUrl) {
            await new Promise(resolve => exec(`curl -sL --fail -o ${thumbPath} "${thumbUrl}"`, resolve));
        }
        
        if (!fs.existsSync(thumbPath) || fs.statSync(thumbPath).size < 100) {
            if (videoId) {
                thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
                await new Promise(resolve => exec(`curl -sL --fail -o ${thumbPath} "${thumbUrl}"`, resolve));
            }
        }

        if (!fs.existsSync(thumbPath) || fs.statSync(thumbPath).size < 100) {
            if (videoId) {
                thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                await new Promise(resolve => exec(`curl -sL --fail -o ${thumbPath} "${thumbUrl}"`, resolve));
            }
        }

        // 3. Composite premium vinyl assets (happens simultaneously with yt-dlp startup)
        const vinylPath = path.join(__dirname, '../assets/vinyl.png');
        const globalBgPath = path.join(__dirname, '../assets/bg.png');
        const discPath = `/tmp/disc_${safeId}.png`;
        
        let hasIm = false;
        if (fs.existsSync(vinylPath) && fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 100) {
            try {
                const magickCmd = `convert ${vinylPath} \\( ${thumbPath} -resize 260x260^ -gravity center -extent 260x260 +repage -alpha set \\( -size 260x260 xc:none -fill white -draw "circle 130,130 130,1" \\) -compose DstIn -composite +repage \\) -gravity center -compose Over -composite png32:${discPath}`;
                await new Promise(resolve => exec(magickCmd, resolve));
                hasIm = fs.existsSync(discPath);
            } catch (e) {
                console.error(`[STREAM] ImageMagick error:`, e);
            }
        }

        // 4. Spawn yt-dlp to download the audio stream via proxy
        const ytdlpArgs = [
            '--proxy', config.PROXY_URL,
            '-q', '--no-warnings',
            '-f', 'bestaudio', 
            '-o', '-',
            url
        ];
        const yt_proc = spawn('yt-dlp', ytdlpArgs);
        yt_proc.on('error', (err) => console.log('[YTDLP Error]', err));

        // 5. Spawn ffmpeg with lightweight per-frame ops
        const ffmpegArgs = [
            '-fflags', 'nobuffer',
            '-analyzeduration', '1M',
            '-probesize', '500k',
            '-y',
            '-f', 'lavfi', '-i', 'color=c=white:s=480x272:r=15', // Pure white background
            '-loop', '1', '-i', hasIm ? discPath : vinylPath, // Fallback to empty vinyl if thumbnail failed
            '-i', 'pipe:0', // audio from yt-dlp
            '-filter_complex', "[0:v]format=rgba[bg];[1:v]scale=260:260,format=rgba,rotate=a=t*1.2:c=none:ow=480:oh=480[spin];[bg][spin]overlay=(W-w)/2:(H-h)/2",
            '-c:v', 'flv1',                       
            '-b:v', '500k',
            '-maxrate', '500k',
            '-bufsize', '1000k',
            '-s', '480x272',
            '-r', '15',
            '-c:a', 'libmp3lame',                 
            '-b:a', '320k',                       
            '-ar', '44100',
            '-ac', '2',
            '-shortest',
            '-flvflags', 'no_duration_filesize',
            '-f', 'flv',
            'pipe:1'
        ];

        console.log(`[STREAM] Spawning ffmpeg pipeline... (IM: ${hasIm})`);
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        yt_proc.stdout.pipe(ffmpeg.stdin);
        
        ffmpeg.stderr.on('data', data => {
            console.log(`[FFMPEG] ${data.toString().trim()}`);
        });

        const tmpCachePath = cachePath + '.tmp';
        const fileStream = fs.createWriteStream(tmpCachePath);
        ffmpeg.stdout.pipe(fileStream);
        ffmpeg.stdout.pipe(res);

        ffmpeg.on("close", (code) => {
            activeTranscodes.delete(safeId);
            if (!res.writableEnded && !res.destroyed) {
                res.end();
            }
            if (code === 0 && fs.existsSync(tmpCachePath)) {
                fs.renameSync(tmpCachePath, cachePath); // Commit cache
            } else if (fs.existsSync(tmpCachePath)) {
                fs.unlinkSync(tmpCachePath); // Discard incomplete cache
            }
            // Cleanup IM temps
            try { fs.unlinkSync(thumbPath); } catch(e){}
            try { fs.unlinkSync(discPath); } catch(e){}
        });

        req.on("close", () => {
            activeTranscodes.delete(safeId);
            console.log(`[STREAM] PSP disconnected. Terminating processes.`);
            try { yt_proc.kill('SIGKILL'); } catch(e) {}
            try { ffmpeg.kill('SIGKILL'); } catch(e) {}
        });

        setTimeout(() => {
            if (activeTranscodes.has(safeId)) {
                console.log(`[STREAM] Hard timeout reached for ${safeId}, killing processes`);
                activeTranscodes.delete(safeId);
                try { yt_proc.kill('SIGKILL'); } catch(e) {}
                try { ffmpeg.kill('SIGKILL'); } catch(e) {}
            }
        }, 1800000); // 30 minutes

    } catch (err) {
        activeTranscodes.delete(safeId);
        console.error(`[STREAM ERROR]`, err);
        if (!res.headersSent) res.status(500).end();
    }
});

app.listen(port, () => {
    console.log(`SpotiFLAC Server listening on port ${port} (IP: ${config.BACKEND_IP})`);
});
