// CloudMedia Plugin for GoTube (PSP)
// Stream movies, anime, and TV shows via the CloudMedia backend
// YOUR_SERVER_IP is replaced by the configure-psp script

var CloudMedia = new Object();
CloudMedia.rev = 3;
CloudMedia.SearchDesc = "Anime, Movies & Resume";
CloudMedia.Name = "CloudMedia";

CloudMedia.Search = function (keyword, page) {
    try {
    // --- VOICE BRIDGE INTERCEPT ---
    if (keyword === "v" || keyword === "V") {
        PSPTube.log("Fetching voice command...\n");
        var voiceText = GetContents("http://YOUR_SERVER_IP:8083/get-voice");
        if (voiceText && voiceText !== "ERROR" && voiceText !== "") {
            keyword = voiceText;
        }
    }
    // ------------------------------

    var result = new Object();
    result.bypage = 20;
    result.start = (page - 1) * result.bypage + 1;
    
    var isMovie = false;
    var isEpisodes = false;
    var isResume = false;
    
    if (keyword.charAt(0) == '$') {
        isMovie = true;
        keyword = keyword.substring(1).replace(/^\s+/, "");
    } else if (keyword.charAt(0) == '>') {
        isEpisodes = true;
        keyword = keyword.substring(1).replace(/^\s+/, "");
    } else if (keyword.charAt(0) == '!') {
        isResume = true;
        keyword = "";
    }
    
    var type = isMovie ? "movie" : (isEpisodes ? "episodes" : (isResume ? "resume" : "anime"));
    var serverUrl = "http://YOUR_SERVER_IP:8082";
    var searchUrl = serverUrl + "/search_media?type=" + type + "&query=" + escape(keyword) + "&page=" + page;
    if (keyword === "!debug") searchUrl = serverUrl + "/debug";
    
    PSPTube.log("CloudMedia Search: " + searchUrl + "\n");
    
    var jsonString = GetContents(searchUrl);
    
    result.VideoInfo = new Array();
    result.total = 0;
    
    // Help card (not shown for resume)
    if (!isResume) {
        var err = {attr:2};
        err.id = "0";
        err.Title = "CloudMedia Help";
        err.Description = "anime name = shows\n>name = episodes\n>name s2 = season 2\n$name = movies\n!resume = resume";
        err.ThumbnailURL = "";
        err.SaveFilename = "info.flv";
        err.URL = "";
        result.VideoInfo.push(err);
    }

    if (jsonString && jsonString.indexOf("success") !== -1) {
        var response = eval("(" + jsonString + ")");
        if (response.success && response.data) {
            result.total = response.total || response.data.length;
            for (var i = 0; i < response.data.length; i++) {
                var item = response.data[i];
                var v = {attr:2};
                v.id = item.id;
                v.Title = item.title || "Unknown Title";
                v.Description = item.description || "";
                
                // Proxy images through HTTP endpoint
                if (item.image && item.image.length > 5) {
                    v.ThumbnailURL = serverUrl + "/img?url=" + escape(item.image);
                } else {
                    v.ThumbnailURL = "";
                }
                
                v.SaveFilename = v.id + ".flv";
                
                if (item.resumeUrl) {
                    v.URL = 'CloudMedia.resume("' + escape(item.resumeUrl) + '||' + item.id + '||' + item.resumePosition + '||' + escape(item.title) + '")';
                } else if (item.season && item.episode) {
                    v.URL = 'CloudMedia.play("anime||' + item.showId + '||' + item.season + '||' + item.episode + '")';
                } else {
                    v.URL = 'CloudMedia.play("' + (isMovie ? "movie" : "anime") + '||' + v.id + '||1||1")';
                }
                result.VideoInfo.push(v);
            }
        }
    }
    } catch (e) {
        try { GetContents("http://YOUR_SERVER_IP:8082/log_error?msg=" + escape("CloudMedia Search Error: " + e.message)); } catch(err) {}
    }
    
    result.end = result.start - 1 + result.VideoInfo.length;
    return result;
}

CloudMedia.play = function (args) {
    var splitArgs = args.split("||");
    var type = splitArgs[0];
    var id = splitArgs[1];
    var season = splitArgs[2] || "1";
    var episode = splitArgs[3] || "1";

    var serverUrl = "http://YOUR_SERVER_IP:8082";
    var linkUrl = serverUrl + "/get_stream_link?type=" + type + "&id=" + escape(id) + "&season=" + season + "&episode=" + episode;
    
    PSPTube.log("Fetching stream: " + linkUrl + "\n");
    var rawM3u8 = GetContents(linkUrl);
    
    if (!rawM3u8 || rawM3u8 === "ERROR") {
        return "";
    }
    
    var mediaId = id + "_s" + season + "e" + episode;
    var playUrl = serverUrl + "/play?url=" + escape(rawM3u8) + "&id=" + escape(mediaId) + "&title=" + escape(id + " S" + season + "E" + episode);
    return playUrl;
}

CloudMedia.resume = function (args) {
    var splitArgs = args.split("||");
    var encodedUrl = splitArgs[0];
    var id = splitArgs[1];
    var position = splitArgs[2];
    var encodedTitle = splitArgs[3];

    var url = unescape(encodedUrl);
    var title = unescape(encodedTitle);

    var serverUrl = "http://YOUR_SERVER_IP:8082";
    var playUrl = serverUrl + "/play?url=" + escape(url) + "&id=" + escape(id) + "&resume=" + position + "&title=" + escape(title);
    
    PSPTube.log("Resuming: " + id + " at " + position + "s\n");
    return playUrl;
}

SiteList.push(CloudMedia);
