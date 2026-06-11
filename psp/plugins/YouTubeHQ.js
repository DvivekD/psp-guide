// YouTubeHQ Plugin for GoTube (PSP)
// Streams YouTube videos in HQ via the yt2009 backend
// YOUR_SERVER_IP is replaced by the configure-psp script

var YouTubeHQ = new Object();
YouTubeHQ.rev = 1;
YouTubeHQ.SearchDesc = "YouTube HQ (1080p Downscaled)";
YouTubeHQ.Name = "YouTubeHQ";

YouTubeHQ.Search = function (keyword, page){
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
	result.start = (page-1)*result.bypage+1;
	var sortBy = "relevance";
	var category = "";
	
    var helpCard = null;
    if (keyword === "?" || keyword === "!help" || keyword === "help") {
        var help = {attr:2};
        help.id = 0;
        help.Title = "YouTubeHQ Commands";
        help.Description = "Search normally, or use commands:\n! = Home Feed\n!m = Music\n!g = Gaming\n$category name = Search in category\n@query = Sort by date";
        help.URL = "";
        result.VideoInfo = new Array();
        result.VideoInfo.push(help);
        result.total = 1;
        result.start = 1;
        result.end = 1;
        return result;
    }

    var isFeed = false;
    var feedType = "";
    var searchUrl = "";
    var authToken = "";
    
    // Parse Commands
    if (keyword === "!" || keyword === "!h" || keyword === "!home" || keyword === "!trending") {
        isFeed = true;
        feedType = "recommendations";
    } else if (keyword === "!m" || keyword === "!music") {
        isFeed = true;
        category = "Music";
    } else if (keyword === "!g" || keyword === "!gaming") {
        isFeed = true;
        category = "Gaming";
    } else if (keyword.charAt(0) == '$') {
		var kpos = keyword.indexOf(" ");
		category = keyword.substring(1, kpos);
		keyword = keyword.substring(kpos+1);
	} else if (keyword.charAt(0) == '@') {
		sortBy = "published";
        keyword = keyword.substring(1);
	}
	
    if (isFeed) {
        if (feedType === "recommendations") {
            searchUrl = 'http://YOUR_SERVER_IP:8081/feeds/api/users/default/recommendations?start-index=' + result.start + '&max-results=' + result.bypage + '&v=2&auth=' + authToken;
        } else if (feedType !== "") {
            searchUrl = 'http://YOUR_SERVER_IP:8081/feeds/api/standardfeeds/' + feedType + '?start-index=' + result.start + '&max-results=' + result.bypage + '&v=2&auth=' + authToken;
        } else {
            searchUrl = 'http://YOUR_SERVER_IP:8081/feeds/api/videos?q=&start-index=' + result.start + '&max-results=' + result.bypage + '&orderby=relevance&racy=include&category=' + category + '&v=2&auth=' + authToken;
        }
    } else {
        if (category !== "") {
            searchUrl = 'http://YOUR_SERVER_IP:8081/feeds/api/videos?q=' + escape(keyword) + '&start-index=' + result.start + '&max-results=' + result.bypage + '&orderby=' + sortBy + '&racy=include&category=' + category + '&v=2&auth=' + authToken;
        } else {
            searchUrl = 'http://YOUR_SERVER_IP:8081/feeds/api/videos?q=' + escape(keyword) + '&start-index=' + result.start + '&max-results=' + result.bypage + '&orderby=' + sortBy + '&racy=include&v=2&auth=' + authToken;
        }
    }
    
	PSPTube.log("Fetching: " + searchUrl + "\n");
	c = GetContents(searchUrl);

	result.total     = ext("<openSearch:totalResults>") * 1;
	result.VideoInfo = new Array();
    
    function getVal(text, tag1, tag2) {
        var p1 = text.indexOf(tag1);
        if (p1 == -1) return "";
        p1 += tag1.length;
        var p2 = (tag2 && tag2 !== "") ? text.indexOf(tag2, p1) : text.indexOf("<", p1);
        if (p2 == -1) return "";
        return text.substring(p1, p2);
    }

	while(p=c.indexOf("<entry",p)+1){
        var endP = c.indexOf("</entry>", p);
        if (endP == -1) endP = c.length;
        var entryText = c.substring(p, endP);
        p = endP;
        
		var v = {attr:2};
		v.id            = getVal(entryText, "<youTubeId id='", "'>");
        if (v.id === "") v.id = getVal(entryText, "/videos/", "<");
        
		v.Title         = getVal(entryText, "<title type='text'>", "");
        var rawDesc     = getVal(entryText, "content type='text'>", "");
        var uploader    = getVal(entryText, "<name>", "");
        
		v.CommentCount  = getVal(entryText, "countHint='", "'") * 1;
		v.Tags          = getVal(entryText, "keywords>", "").replace(/,/g, "");
        
        var length      = getVal(entryText, "seconds='", "'") * 1;
		v.RatingAvg     = getVal(entryText, "average='", "'") * 1;
		v.RatingCount   = getVal(entryText, "numRaters='", "'") * 1;
		v.MylistCount   = getVal(entryText, "favoriteCount=\"", "\"") * 1;
        var views       = getVal(entryText, "viewCount=\"", "\"") * 1;
        
        var min = Math.floor(length / 60);
        var sec = length % 60;
        var lenStr = min + ":" + (sec < 10 ? "0" + sec : sec);

		v.Description   = "By: " + uploader + " | Views: " + views + " | Length: " + lenStr + "\n" + rawDesc;
		v.Description   = v.Description.substring(0, 200);
        
		v.LengthSeconds = length;
		v.ViewCount     = views * 1;
        
		v.ThumbnailURL  = 'http://i.ytimg.com/vi/' + v.id + '/default.jpg';
        
		v.SaveFilename  = v.id+".flv";
		v.URL	          = 'YouTubeHQ.play("'+v.id+'")';
		result.VideoInfo.push(v);
	}
    } catch (e) {
        try { GetContents("http://YOUR_SERVER_IP:8082/log_error?msg=" + escape("YouTubeHQ Search Error: " + e.message)); } catch(err) {}
    }
	result.end       = result.start-1+result.VideoInfo.length;
    
	return result;
}

YouTubeHQ.play = function (id){
	return "http://YOUR_SERVER_IP:8081/stream_flv_v4?v="+id;
}
SiteList.push(YouTubeHQ);
