/** HARD-CODED FUNCTIONS **/
function CallGate_GetSiteList(){
 if(PSPTube.MultiView){
  TmpSiteList = new Array();
  for(i=0;i<SiteList.length;i++){TmpSiteList[i] = SiteList[i].Name}
  TmpSiteList.push('Favorites');
  TmpSiteList.push('Playlist');
  TmpSiteList.push('Onsens');
  for(i=0;i<SiteList.length;i++){
   SiteList[i].Name = ''+SiteList[i].Name+' ';
   for(j=1;j<10;j++){SiteList[i].Name+='> '+TmpSiteList[(i+j)%(SiteList.length+3)]+' ';}
  }
 }
 return SiteList;
}
function CallGate_SearchSite(sitename,keyword,offset){
 p=0;
 return eval(sitename.match(/\w+/)+'.Search("'+keyword+'",'+(9+offset)/10+')');
}
function CallGate_VideoURLResolver(url){return eval(url);}