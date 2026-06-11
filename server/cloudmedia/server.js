const express = require('express');
const axios = require('axios');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

// Global socket error safety net
app.use((req, res, next) => {
    req.on('error', () => {});
    res.on('error', () => {});
    if (req.socket) req.socket.on('error', () => {});
    if (res.socket) res.socket.on('error', () => {});
    next();
});

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        const yt = spawn('yt-dlp', args);
        yt.stdout.on('data', data => stdout += data.toString());
        yt.stderr.on('data', data => stderr += data.toString());
        yt.on('close', code => {
            if (code !== 0 && stdout.trim() === '') reject(stderr);
            else resolve(stdout);
        });
    });
}

// ============================================================
// CONFIGURATION — reads from .env or defaults
// ============================================================
const PORT = process.env.GOTUBE_PORT || 8082;
const BACKEND_IP = process.env.BACKEND_IP || '127.0.0.1';
const PROXY_URL = process.env.PROXY_URL || 'socks5://127.0.0.1:40000';

const DEFAULT_PROVIDERS = [
    { name: 'hdhub', build: (t, id) => `https://hdhub.thevolecitor.qzz.io/eyJ0b3Jib3giOiJ1bnNldCIsInF1YWxpdGllcyI6IjIxNjBwLDEwODBwLDcyMHAiLCJzb3J0IjoiZGVzYyJ9/stream/${t}/${id}.json` },
    { name: 'webstreamrmbg', build: (t, id) => `https://87d6a6ef6b58-webstreamrmbg.baby-beamup.club/stream/${t}/${id}.json` },
    { name: 'ytvizio', build: (t, id) => `https://ytvizio.com/stream/${t}/${id}.json` },
    { name: 'peerflix', build: (t, id) => `https://peerflix-addon.herokuapp.com/stream/${t}/${id}.json` },
    { name: 'flixfinder', build: (t, id) => `https://flixnest.app/flix-finder/stream/${t}/${id}.json` },
    { name: 'watchnow', build: (t, id) => `https://sword-watch.vercel.app/stream/${t}/${id}.json` },
    { name: 'sootio', build: (t, id) => `https://sooti.click/stream/${t}/${id}.json` }
];

let activeProviders = [...DEFAULT_PROVIDERS];
const providerWinnerCache = new Map();
const activeTranscodes = new Set();
const assetsDir = path.join(__dirname, 'cache');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

// Resume data
const resumeFile = path.join(__dirname, 'resume.json');
var resumeData = {};
try {
    if (fs.existsSync(resumeFile)) {
        resumeData = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
        console.log('[Resume] Loaded ' + Object.keys(resumeData).length + ' saved positions');
    }
} catch (e) { resumeData = {}; }

function saveResumeData() {
    try { fs.writeFileSync(resumeFile, JSON.stringify(resumeData, null, 2)); } catch (e) {}
}

// Image cache
var imageCache = new Map();
var IMAGE_CACHE_MAX = 200;

// ============================================================
// CRASH GUARDS
// ============================================================
process.on('uncaughtException', function(err) {
    console.error('[CRASH GUARD] Uncaught Exception:', err.message);
    console.error(err.stack);
});
process.on('unhandledRejection', function(reason) {
    console.error('[CRASH GUARD] Unhandled Rejection:', reason);
});

// Kill orphan ffmpeg on startup
try {
    execSync('pkill -f "ffmpeg.*cache" || true', { stdio: 'ignore' });
} catch (e) {}

// Cache cleanup — every 30 minutes
function cleanupCache() {
    try {
        var files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.flv'));
        var totalSize = 0;
        var fileStats = [];
        files.forEach(file => {
            try {
                var filePath = path.join(assetsDir, file);
                var stat = fs.statSync(filePath);
                totalSize += stat.size;
                fileStats.push({ file, path: filePath, mtime: stat.mtime.getTime(), size: stat.size });
            } catch (e) {}
        });
        var deleted = 0;
        fileStats.forEach(f => {
            if (Date.now() - f.mtime > 2 * 60 * 60 * 1000) {
                try { fs.unlinkSync(f.path); totalSize -= f.size; deleted++; } catch (e) {}
            }
        });
        if (totalSize > 1024 * 1024 * 1024) {
            fileStats.sort((a, b) => a.mtime - b.mtime);
            for (var i = 0; i < fileStats.length && totalSize > 512 * 1024 * 1024; i++) {
                try {
                    if (fs.existsSync(fileStats[i].path)) {
                        fs.unlinkSync(fileStats[i].path);
                        totalSize -= fileStats[i].size;
                        deleted++;
                    }
                } catch (e) {}
            }
        }
        if (deleted > 0) console.log('[Cache] Cleaned ' + deleted + ' files. Remaining: ' + (totalSize / 1024 / 1024).toFixed(0) + 'MB');
    } catch (e) {}
}
setInterval(cleanupCache, 30 * 60 * 1000);

// Memory monitor
setInterval(function() {
    var mem = process.memoryUsage();
    if (mem.rss > 400 * 1024 * 1024) {
        console.warn('[Memory] WARNING: RSS=' + (mem.rss / 1024 / 1024).toFixed(0) + 'MB — clearing image cache');
        imageCache.clear();
    }
}, 5 * 60 * 1000);

// Clean old resume entries
setInterval(function() {
    var now = Date.now();
    var cleaned = 0;
    Object.keys(resumeData).forEach(key => {
        if (now - resumeData[key].timestamp > 7 * 24 * 60 * 60 * 1000) {
            delete resumeData[key];
            cleaned++;
        }
    });
    if (cleaned > 0) { saveResumeData(); console.log('[Resume] Cleaned ' + cleaned + ' old entries'); }
}, 6 * 60 * 60 * 1000);

// ============================================================
// ENDPOINT: /img — HTTPS→HTTP Image Proxy
// ============================================================
app.get('/img', async function(req, res) {
    var url = req.query.url;
    if (url && (url.includes("googleusercontent.com") || url.includes("ggpht.com"))) {
        url = url.replace(/=w[0-9]+-h[0-9]+.*$/, "=w480-h272-n-p-k-c0x00ffffff-no-rj");
    }
    if (!url) return res.sendStatus(400);
    if (imageCache.has(url)) {
        var cached = imageCache.get(url);
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': cached.length, 'Cache-Control': 'public, max-age=86400' });
        return res.end(cached);
    }
    try {
        var imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        var imgBuffer = Buffer.from(imgRes.data);
        if (imageCache.size >= IMAGE_CACHE_MAX) { imageCache.delete(imageCache.keys().next().value); }
        imageCache.set(url, imgBuffer);
        res.writeHead(200, { 'Content-Type': imgRes.headers['content-type'] || 'image/jpeg', 'Content-Length': imgBuffer.length, 'Cache-Control': 'public, max-age=86400' });
        res.end(imgBuffer);
    } catch (e) { res.sendStatus(404); }
});

// ============================================================
// ENDPOINT: /search_media
// ============================================================
app.get('/search_media', async function(req, res) {
    var type = req.query.type || 'anime';
    var query = req.query.query || '';
    var page = parseInt(req.query.page) || 1;
    console.log('[Search] type=' + type + ' query=' + query + ' page=' + page);

    try {
        if (type === 'resume') {
            var entries = Object.keys(resumeData).map(key => {
                var r = resumeData[key];
                var posMins = Math.floor(r.position / 60);
                var posSecs = Math.floor(r.position % 60);
                return { id: key, title: '▶ ' + (r.title || key), description: 'Resume at ' + posMins + ':' + (posSecs < 10 ? '0' : '') + posSecs, image: '', resumeUrl: r.url, resumeReferer: r.referer || '', resumePosition: r.position };
            });
            entries.sort((a, b) => (resumeData[b.id].timestamp || 0) - (resumeData[a.id].timestamp || 0));
            return res.json({ success: true, data: entries.slice(0, 20), total: entries.length });
        }

        if (!query) return res.json({ success: false, data: [] });

        if (type === 'episodes') {
            var seasonNum = 1;
            var seasonMatch = query.match(/\bs(\d+)\s*$/i);
            if (seasonMatch) { seasonNum = parseInt(seasonMatch[1]); query = query.replace(/\bs\d+\s*$/i, '').trim(); }
            var searchRes = await axios.get('https://v3-cinemeta.strem.io/catalog/series/top/search=' + encodeURIComponent(query) + '.json', { timeout: 30000 });
            var metas = searchRes.data.metas || [];
            if (metas.length === 0) return res.json({ success: false, data: [] });
            var show = metas[0];
            var showPoster = show.poster || '';
            var metaRes = await axios.get('https://v3-cinemeta.strem.io/meta/series/' + show.id + '.json', { timeout: 30000 });
            var allEpisodes = (metaRes.data.meta && metaRes.data.meta.videos) || [];
            var episodes = allEpisodes.filter(e => e.season === seasonNum);
            var seasons = {};
            allEpisodes.forEach(e => { if (e.season > 0) seasons[e.season] = true; });
            var seasonList = Object.keys(seasons).sort((a, b) => a - b);
            var perPage = 20;
            var startIdx = (page - 1) * perPage;
            var pageEpisodes = episodes.slice(startIdx, startIdx + perPage);
            var results = pageEpisodes.map(e => ({ id: show.id + '_s' + e.season + 'e' + e.episode, showId: show.id, title: 'S' + e.season + 'E' + e.episode + ': ' + (e.name || 'Episode ' + e.episode), description: show.name + ' | Seasons: ' + seasonList.join(', '), image: e.thumbnail || showPoster || '', season: e.season, episode: e.episode }));
            return res.json({ success: true, data: results, total: episodes.length });
        }

        var catalogType = (type === 'movie') ? 'movie' : 'series';
        var metaRes = await axios.get('https://v3-cinemeta.strem.io/catalog/' + catalogType + '/top/search=' + encodeURIComponent(query) + '.json', { timeout: 30000 });
        var results = (metaRes.data.metas || []).slice(0, 10).map(m => ({ id: m.id, title: m.name, image: m.poster || '', description: (type === 'movie') ? (m.year || '') + ' | Movie' : (m.year || '') + ' | Search: >' + (m.name || '').toLowerCase(), releaseDate: m.year || '', type: type === 'movie' ? 'Movie' : 'Anime' }));
        res.json({ success: true, data: results });
    } catch (e) { console.error('[Search] Failed:', e.message); res.json({ success: false, data: [] }); }
});

// ============================================================
// ENDPOINT: /get_stream_link
// ============================================================
async function validateStreamUrl(url, referer) {
    try {
        var headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        if (referer) headers['Referer'] = referer;
        await axios.head(url, { timeout: 4000, headers, maxRedirects: 5, validateStatus: s => s < 400 });
        return true;
    } catch (e) {
        try {
            var headers2 = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Range': 'bytes=0-1023' };
            if (referer) headers2['Referer'] = referer;
            await axios.get(url, { timeout: 4000, headers: headers2, responseType: 'arraybuffer', maxRedirects: 5, validateStatus: s => s < 400 });
            return true;
        } catch (e2) { return false; }
    }
}

app.get('/get_stream_link', async function(req, res) {
    var type = req.query.type || 'anime';
    var id = req.query.id || '';
    var season = req.query.season || '1';
    var episode = req.query.episode || '1';
    if (!id) return res.send('ERROR');
    console.log('[Stream] type=' + type + ' id=' + id + ' S' + season + 'E' + episode);

    try {
        var stremioType = (type === 'movie') ? 'movie' : 'series';
        var stremioId = (type === 'movie') ? id : id + ':' + season + ':' + episode;

        let currentProviders = [...activeProviders];
        if (providerWinnerCache.has(stremioId)) {
            let cached = providerWinnerCache.get(stremioId);
            if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
                let winnerIdx = currentProviders.findIndex(p => p.name === cached.providerName);
                if (winnerIdx > 0) { let winner = currentProviders.splice(winnerIdx, 1)[0]; currentProviders.unshift(winner); }
            } else { providerWinnerCache.delete(stremioId); }
        }

        let overallStartTime = Date.now();
        for (let provider of currentProviders) {
            if (Date.now() - overallStartTime >= 30000) break;
            try {
                let pUrl = provider.build(stremioType, stremioId);
                let pRes = await axios.get(pUrl, { timeout: 8000 });
                var streams = pRes.data.streams || [];
                if (streams.length === 0) continue;

                function getStreamPriority(s) {
                    var u = s.url || '';
                    var n = (s.name || '').toLowerCase().replace(/\n/g, ' ');
                    var resBonus = 0, hostScore = 6;
                    if (n.indexOf('1080p') !== -1) resBonus = -20;
                    else if (n.indexOf('720p') !== -1) resBonus = -15;
                    else if (n.indexOf('4k') !== -1 || n.indexOf('2160') !== -1) resBonus = 50;
                    else resBonus = 30;
                    if (u.indexOf('diskcdn.buzz') !== -1) hostScore = 1;
                    else if (u.indexOf('.r2.dev') !== -1) hostScore = 2;
                    else if (u.indexOf('homelander') !== -1) hostScore = 3;
                    else if (u.indexOf('pixeldrain') !== -1) hostScore = 4;
                    else if (u.indexOf('googleusercontent.com') !== -1) hostScore = 5;
                    else if (u.indexOf('.m3u8') !== -1) hostScore = 8;
                    return resBonus + hostScore;
                }

                var sortedStreams = streams.filter(s => s.url && s.url.length > 10).sort((a, b) => getStreamPriority(a) - getStreamPriority(b));
                for (var i = 0; i < sortedStreams.length && i < 10; i++) {
                    if (Date.now() - overallStartTime >= 30000) break;
                    var candidate = sortedStreams[i];
                    var candidateReferer = '';
                    if (candidate.behaviorHints && candidate.behaviorHints.proxyHeaders && candidate.behaviorHints.proxyHeaders.request) {
                        candidateReferer = candidate.behaviorHints.proxyHeaders.request.Referer || '';
                    }
                    var isValid = await validateStreamUrl(candidate.url, candidateReferer);
                    if (isValid) {
                        var rawUrl = candidate.url;
                        if (candidateReferer) rawUrl = rawUrl + '|||' + candidateReferer;
                        providerWinnerCache.set(stremioId, { providerName: provider.name, timestamp: Date.now() });
                        return res.send(rawUrl);
                    }
                }
            } catch (err) { continue; }
        }
        return res.send('ERROR');
    } catch (e) { res.send('ERROR'); }
});

// ============================================================
// ENDPOINT: /jiosaavn_search — Music search via YouTube Music
// ============================================================
app.get('/jiosaavn_search', function(req, res) {
    try {
        var query = req.query.q || 'lofi';
        var queryType = 'song';
        var cleanQuery = query;
        if (query.startsWith('@')) { queryType = 'album'; cleanQuery = query.substring(1).trim(); }
        else if (query.startsWith('!')) { queryType = 'playlist'; cleanQuery = query.substring(1).trim(); }

        var pyArgs = [pythonCmd, path.join(__dirname, '../spotiflac/ytm_search.py'), queryType, cleanQuery];
        var child = spawn(pyArgs[0], pyArgs.slice(1));
        child.on('error', () => {});
        var stdoutData = '';
        child.stdout.on('data', chunk => stdoutData += chunk);
        child.on('close', code => {
            if (code !== 0) return res.json([]);
            try {
                var entries = JSON.parse(stdoutData);
                var jsonResponse = entries.map(entry => {
                    var title = entry.title + ' - ' + entry.album;
                    var d = parseInt(entry.duration);
                    var durStr = (!isNaN(d) && d > 0) ? Math.floor(d / 60) + ':' + (d % 60).toString().padStart(2, '0') : 'Audio';
                    return { id: entry.id, title: title, artist: durStr, image: entry.image || '' };
                });
                res.json(jsonResponse);
            } catch(e) { res.json([]); }
        });
    } catch(err) { res.status(500).json([]); }
});

app.get('/jiosaavn_get_link', function(req, res) {
    var id = req.query.id;
    res.send(`http://${BACKEND_IP}:${PORT}/jiosaavn_stream?id=` + encodeURIComponent(id));
});

// ============================================================
// ENDPOINT: /jiosaavn_stream — Audio to FLV
// ============================================================
app.get('/jiosaavn_stream', async function(req, res) {
    var id = req.query.id;
    var safeId = 'jio_' + id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    var outputFile = path.join(assetsDir, safeId + '.flv');

    function serveFLV() {
        if (!fs.existsSync(outputFile)) return res.sendStatus(404);
        var stat = fs.statSync(outputFile);
        res.writeHead(200, { 'Content-Type': 'video/x-flv', 'Connection': 'close' });
        fs.createReadStream(outputFile).on('error', () => {}).pipe(res).on('error', () => {});
    }

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100 * 1024) return serveFLV();
    if (activeTranscodes.has(safeId)) {
        var w1 = 0;
        var p1 = setInterval(() => { w1 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100 * 1024) { clearInterval(p1); return serveFLV(); } if (w1 >= 8000) { clearInterval(p1); return fs.existsSync(outputFile) ? serveFLV() : res.sendStatus(404); } }, 500);
        return;
    }
    if (activeTranscodes.size >= 2) return res.sendStatus(503);
    activeTranscodes.add(safeId);

    try {
        var yt_url = 'https://music.youtube.com/watch?v=' + id;
        var ytdlpArgs = ['-q', '--no-warnings', '-f', 'bestaudio/best', '-o', '-', yt_url];
        if (process.env.PROXY_URL) ytdlpArgs.unshift('--proxy', process.env.PROXY_URL);
        var yt_proc = spawn('yt-dlp', ytdlpArgs);
        yt_proc.on('error', () => {});
        var ffmpegArgs = ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=480x272:r=1', '-i', 'pipe:0', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'flv1', '-b:v', '50k', '-s', '480x272', '-r', '1', '-c:a', 'libmp3lame', '-ar', '44100', '-ac', '2', '-ab', '320k', '-shortest', outputFile];
        var ffmpeg = spawn('ffmpeg', ffmpegArgs);
        ffmpeg.on('error', () => {});
        yt_proc.stdout.on('error', () => {}); ffmpeg.stdin.on('error', () => {});
        yt_proc.stdout.pipe(ffmpeg.stdin).on('error', () => {});
        ffmpeg.on('close', code => { activeTranscodes.delete(safeId); });
        var w2 = 0;
        var p2 = setInterval(() => { w2 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100 * 1024) { clearInterval(p2); return serveFLV(); } if (w2 >= 12000) { clearInterval(p2); return res.sendStatus(404); } }, 500);
    } catch(err) { activeTranscodes.delete(safeId); res.status(500).end(); }
});

// ============================================================
// ENDPOINT: /play_audio — Audio muxed into black FLV
// ============================================================
app.get('/play_audio', async function(req, res) {
    var url = req.query.url || '';
    var id = req.query.id || '';
    if (!url || !id) return res.sendStatus(400);
    var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    var outputFile = path.join(assetsDir, safeId + '_audio.flv');

    function serveFLV() {
        if (!fs.existsSync(outputFile)) return res.sendStatus(404);
        res.writeHead(200, { 'Content-Type': 'video/x-flv', 'Connection': 'close' });
        fs.createReadStream(outputFile).on('error', () => {}).pipe(res).on('error', () => {});
    }

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) return serveFLV();
    if (activeTranscodes.has(safeId)) {
        var w1 = 0;
        var p1 = setInterval(() => { w1 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) { clearInterval(p1); return serveFLV(); } if (w1 >= 8000) { clearInterval(p1); return fs.existsSync(outputFile) ? serveFLV() : res.sendStatus(404); } }, 500);
        return;
    }
    if (activeTranscodes.size >= 2) return res.sendStatus(503);
    activeTranscodes.add(safeId);

    var ffmpeg = spawn('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=480x272:r=1', '-i', url, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'flv1', '-b:v', '50k', '-s', '480x272', '-r', '1', '-c:a', 'libmp3lame', '-ar', '44100', '-ac', '2', '-ab', '320k', '-shortest', outputFile]);
    ffmpeg.on('error', () => {});
    ffmpeg.on('close', () => activeTranscodes.delete(safeId));
    var w2 = 0;
    var p2 = setInterval(() => { w2 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) { clearInterval(p2); return serveFLV(); } if (w2 >= 9000) { clearInterval(p2); return res.sendStatus(404); } }, 500);
});

// ============================================================
// ENDPOINT: /play — Video transcode to FLV with resume
// ============================================================
function getMediaInfo(videoUrl, refererStr) {
    return new Promise(resolve => {
        var cmdArgs = [];
        if (refererStr) cmdArgs.push('-headers', 'Referer: ' + refererStr + '\r\nUser-Agent: Mozilla/5.0\r\n');
        cmdArgs.push('-v', 'error', '-show_entries', 'stream=index,codec_type:stream_tags=language:format=duration', '-of', 'json', videoUrl);
        var proc = spawn('ffprobe', cmdArgs);
        var stdout = '';
        proc.stdout.on('data', d => stdout += d);
        proc.on('close', code => {
            var result = { audioMap: '-map 0:a:0?', duration: 1440 };
            if (code !== 0) return resolve(result);
            try {
                var data = JSON.parse(stdout);
                if (data.format && data.format.duration) { var d = parseFloat(data.format.duration); if (!isNaN(d)) result.duration = d; }
                var streams = data.streams || [];
                var audioStreams = streams.filter(s => s.codec_type === 'audio');
                if (audioStreams.length === 0) { result.audioMap = ''; return resolve(result); }
                var engStream = audioStreams.find(s => s.tags && s.tags.language && s.tags.language.toLowerCase().indexOf('eng') !== -1);
                var jpnStream = audioStreams.find(s => s.tags && s.tags.language && s.tags.language.toLowerCase().indexOf('jpn') !== -1);
                var selectedStream = engStream || jpnStream || audioStreams[0];
                result.audioMap = '-map 0:' + selectedStream.index + '?';
                return resolve(result);
            } catch(e) { return resolve(result); }
        });
        proc.on('error', () => resolve({ audioMap: '-map 0:a:0?', duration: 1440 }));
    });
}

const activeTranscodesMap = new Map();

app.get('/play', async function(req, res) {
    var url = req.query.url || '';
    var id = req.query.id || '';
    var resumePos = parseInt(req.query.resume) || 0;
    var title = req.query.title || id;
    if (!url || !id || url === 'ERROR') return res.sendStatus(400);

    var referer = '';
    if (url.indexOf('|||') !== -1) { var parts = url.split('|||'); url = parts[0]; referer = parts[1] || ''; }

    var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (resumePos > 0) safeId = safeId + '_r' + resumePos;
    var outputFile = path.join(assetsDir, safeId + '.flv');

    function serveFLV() {
        if (!fs.existsSync(outputFile)) return res.sendStatus(404);
        res.writeHead(200, { 'Content-Type': 'video/x-flv', 'Connection': 'close' });
        var stream = fs.createReadStream(outputFile);
        stream.pipe(res).on('error', () => {});
        res.on('close', function() {
            var bytesWritten = res.socket ? res.socket.bytesWritten : 0;
            var watchedSeconds = bytesWritten / ((900000 + 128000) / 8);
            var isFinished = false;
            if (!activeTranscodesMap.has(safeId) && fs.existsSync(outputFile)) {
                if (fs.statSync(outputFile).size > 0 && bytesWritten >= fs.statSync(outputFile).size * 0.9) isFinished = true;
            }
            if (watchedSeconds > 30 && !isFinished) {
                var resumeAt = Math.max(0, Math.floor(watchedSeconds + resumePos - 30));
                resumeData[id] = { position: resumeAt, title: title, url: url + (referer ? '|||' + referer : ''), referer: referer, timestamp: Date.now() };
                saveResumeData();
            } else if (isFinished && resumeData[id]) { delete resumeData[id]; saveResumeData(); }
        });
    }

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) return serveFLV();
    if (activeTranscodesMap.has(safeId)) {
        var w1 = 0;
        var p1 = setInterval(() => { w1 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) { clearInterval(p1); return serveFLV(); } if (w1 >= 15000) { clearInterval(p1); return res.sendStatus(404); } }, 500);
        return;
    }

    var mediaInfo = await getMediaInfo(url, referer);
    var ffmpegArgs = ['-y', '-fflags', '+genpts'];
    if (referer) ffmpegArgs.push('-headers', 'Referer: ' + referer + '\r\nUser-Agent: Mozilla/5.0\r\n');
    if (resumePos > 0) ffmpegArgs.push('-ss', String(resumePos));
    ffmpegArgs.push('-i', url, '-map', '0:v:0');
    if (mediaInfo.audioMap) { var mapArgs = mediaInfo.audioMap.split(' '); ffmpegArgs.push(mapArgs[0], mapArgs[1]); }
    ffmpegArgs.push('-map_metadata', '-1', '-vcodec', 'flv1', '-b:v', '900k', '-maxrate', '1100k', '-bufsize', '2200k', '-s', '480x272', '-g', '60', '-vsync', '1', '-acodec', 'libmp3lame', '-ar', '44100', '-ac', '2', '-ab', '128k', '-af', 'aresample=async=1,volume=1.5', '-max_interleave_delta', '0', '-f', 'flv', outputFile);

    var ffmpeg = spawn('ffmpeg', ffmpegArgs);
    activeTranscodesMap.set(safeId, ffmpeg);
    ffmpeg.on('close', () => activeTranscodesMap.delete(safeId));
    ffmpeg.on('error', () => activeTranscodesMap.delete(safeId));

    var w2 = 0;
    var p2 = setInterval(() => { w2 += 500; if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 500 * 1024) { clearInterval(p2); return serveFLV(); } if (w2 >= 15000) { clearInterval(p2); return res.sendStatus(404); } }, 500);
});

// Health check
app.get('/', function(req, res) {
    var mem = process.memoryUsage();
    res.json({ status: 'ok', version: 'v3', activeTranscodes: Array.from(activeTranscodes), cacheFiles: fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith('.flv')).length : 0, imageCacheSize: imageCache.size, resumeEntries: Object.keys(resumeData).length, memoryMB: (mem.rss / 1024 / 1024).toFixed(0) });
});

app.listen(PORT, function() {
    console.log('\n========================================');
    console.log('  PSP Cloud Engine v3 on port ' + PORT);
    console.log('  Backend IP: ' + BACKEND_IP);
    console.log('  Cache: ' + assetsDir);
    console.log('========================================\n');
});
