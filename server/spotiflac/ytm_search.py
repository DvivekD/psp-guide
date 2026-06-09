import sys
import json
from ytmusicapi import YTMusic

def main():
    if len(sys.argv) < 3:
        print(json.dumps([]))
        return

    query_type = sys.argv[1]
    query = sys.argv[2]
    
    yt = YTMusic()
    results = []
    
    try:
        if query_type == "album":
            # Search for albums and get the first one
            search_res = yt.search(query, filter="albums")
            if search_res and len(search_res) > 0:
                browse_id = search_res[0].get('browseId')
                if browse_id:
                    album_details = yt.get_album(browse_id)
                    tracks = album_details.get('tracks', [])
                    album_title = album_details.get('title', 'Unknown Album')
                    for t in tracks:
                        results.append({
                            'id': t.get('videoId'),
                            'title': t.get('title', 'Unknown'),
                            'album': album_title,
                            'duration': t.get('duration_seconds', 0),
                            'image': album_details.get('thumbnails', [{'url': ''}])[-1]['url'] if album_details.get('thumbnails') else ''
                        })
                        
        elif query_type == "playlist":
            search_res = yt.search(query, filter="playlists")
            if search_res and len(search_res) > 0:
                browse_id = search_res[0].get('browseId')
                if browse_id:
                    playlist_details = yt.get_playlist(browse_id)
                    tracks = playlist_details.get('tracks', [])
                    for t in tracks:
                        results.append({
                            'id': t.get('videoId'),
                            'title': t.get('title', 'Unknown'),
                            'album': t.get('album', {}).get('name', '') if t.get('album') else '',
                            'duration': t.get('duration_seconds', 0),
                            'image': t.get('thumbnails', [{'url': ''}])[-1]['url'] if t.get('thumbnails') else ''
                        })
                        
        else:
            # Default song search
            search_res = yt.search(query, filter="songs")
            for t in search_res:
                results.append({
                    'id': t.get('videoId'),
                    'title': t.get('title', 'Unknown'),
                    'album': t.get('album', {}).get('name', '') if t.get('album') else '',
                    'duration': t.get('duration_seconds', 0),
                    'image': t.get('thumbnails', [{'url': ''}])[-1]['url'] if t.get('thumbnails') else ''
                })
                
        # Filter out invalid entries without videoId
        filtered_results = [r for r in results if r.get('id')]
        print(json.dumps(filtered_results))
        
    except Exception as e:
        print(json.dumps([]))

if __name__ == "__main__":
    main()
