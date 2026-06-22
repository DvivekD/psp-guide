// SpotiFLAC Plugin for GoTube (PSP)
// High-quality music streaming via YouTube Music backend
// YOUR_SERVER_IP is replaced by the configure-psp script

var SpotiFLAC = new Object();
SpotiFLAC.rev = 3;
SpotiFLAC.SearchDesc = "High-Quality Lossless Music";
SpotiFLAC.Name = "SpotiFLAC";

// ==========================================================
// CONFIGURATION — YOUR_SERVER_IP is auto-replaced by setup
// ==========================================================
var BACKEND_IP = "YOUR_SERVER_IP";
var SEARCH_URL = "http://" + BACKEND_IP + ":8083/search?q=";
var GET_LINK_URL = "http://" + BACKEND_IP + ":8083/get_stream_link?id=";

SpotiFLAC.Search = function (keyword, page) {
    var result = new Object();
    result.bypage = 20;
    result.start = (page - 1) * result.bypage + 1;
    
    var url = "";
    if (keyword == "v" || keyword == " ") {
        url = "http://" + BACKEND_IP + ":8083/voice-search";
    } else {
        url = SEARCH_URL + escape(keyword) + "&page=" + page;
    }
    PSPTube.log("SpotiFLAC Search: " + url + "\n");
    
    var jsonString = GetContents(url);
    result.VideoInfo = new Array();
    result.total = 0;
    
    if (jsonString && jsonString.length > 5) {
        var items = jsonString.split('},{');
        if (items.length > 0) {
            result.total = items.length;
            for (var i = 0; i < items.length; i++) {
                var itemStr = items[i];
                var v = {attr:2};
                
                var idStart = itemStr.indexOf('"id":"') + 6;
                var idEnd = itemStr.indexOf('"', idStart);
                v.id = (idStart > 5 && idEnd > idStart) ? itemStr.substring(idStart, idEnd) : "";
                
                var imageStart = itemStr.indexOf('"thumbnail":"') + 13;
                var imageEnd = itemStr.indexOf('"', imageStart);
                var itemImage = (imageStart > 12 && imageEnd > imageStart) ? itemStr.substring(imageStart, imageEnd) : "";
                var itemUrl = v.id;
                
                var titleStart = itemStr.indexOf('"title":"') + 9;
                var titleEnd = itemStr.indexOf('"', titleStart);
                v.Title = (titleStart > 8 && titleEnd > titleStart) ? itemStr.substring(titleStart, titleEnd) : "Unknown Track";
                
                var uploaderStart = itemStr.indexOf('"uploader":"') + 12;
                var uploaderEnd = itemStr.indexOf('"', uploaderStart);
                v.Description = (uploaderStart > 11 && uploaderEnd > uploaderStart) ? itemStr.substring(uploaderStart, uploaderEnd) : "Unknown Artist";
                
                if (!v.id) continue;
                
                v.ThumbnailURL = itemImage ? ("http://" + BACKEND_IP + ":8083/proxy_image?url=" + escape(itemImage)) : "";
                v.SaveFilename = v.id + ".flv";
                v.URL = 'SpotiFLAC.play("' + escape(itemUrl) + '")';
                result.VideoInfo.push(v);
            }
        }
    }
    
    result.end = result.start - 1 + result.VideoInfo.length;
    return result;
}

SpotiFLAC.play = function(encodedId) {
    var id = unescape(encodedId);
    var streamUrl = "http://" + BACKEND_IP + ":8083/stream?id=" + escape(id) + "&ext=.flv";
    
    PSPTube.log("Playing stream: " + streamUrl + "\n");
    
    return streamUrl;
}

SiteList.push(SpotiFLAC);
