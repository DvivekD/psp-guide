var PSPTube=new Object();
var rev = 4;
var psp = document.getElementsByTagName('object')[0];
/* language part add your own language if you want */
switch(navigator.language){
	case "fr"://biscottealacrevette
		var msgAdultRepo="Ce dossier contient des script pour adulte\nContinuer ?";
		var msgUpdateRP="Une nouvelle version du module de mise a jours a été trouvé\nl'installer ?";
		var msgUpdateGo="Une nouvelle version de Go!Tube a été trouvé\nl'installer ?";
		var msgScriptRm="Voulez-vous vraiment supprimer ce script?";
	break;
	case "es"://glas
		var msgAdultRepo="Esta carpeta contiene contenido explicito\n¿ Deseas continuar ?";
		var msgUpdateRP="Se ha encontrado una nueva version\n¿ Deseas instalarla ?";
		var msgUpdateGo="Se ha encontrado una nueva version de GoTube\n¿ Deseas instalarla ?";
		var msgScriptRm="Voulez-vous vraiment supprimer ce script?";
	break;
	case "lol"://replace with your lang id (jp cn de ...)
		var msgAdultRepo="?";
		var msgUpdateRP="?";
		var msgUpdateGo="?";
	break;
	default ://biscottealacrevette (used if none of previous langage was good)
		var msgAdultRepo="This repository contain adult script\nContinue ?";
		var msgUpdateRP="A new version of the Updateur was found\nInstal it ?";
		var msgUpdateGo="A new version of Go!Tube was found\nInstal it ?";
		var msgUpdateGo="Delete this script ?";
	break;
}
/*you wana try to understand how it's work ?*/
var c = '';
var rep=[];
var repMenu='';
var OnModList=[];
var LocModList=[];
var Header = "<style>*{margin:0;}</style>"
function hardGet(url,UA){//Fooooooo
 document.title='[GET]'+url;
 psp.sysRadioHttpGetTerminate();
 psp.sysRadioPrepareForHttpGet(url,UA);
 var i=0;
 while(psp.sysRadioGetHttpGetStatus()==1){document.title='['+(i++)+']'+url;}
 document.title='GET[OK] : '+url;
 c = psp.sysRadioGetHttpGetResult();
 psp.sysRadioHttpGetTerminate();
 return c;
}
function init(){
 psp.sysRadioSetDebugMode(1);
 psp.sysRadioSetDebugLogTextStyle(96,0,0,255, 96,0,0,255, 30,30,40,0, 1, 2);
 loadLocalFile();
 eval(hardGet('http://gotube.googlecode.com/svn/trunk/repositoryList.txt','Go!Tube updater rev'+rev));
 if(!Lrev){eval(hardGet('http://'+prompt('server seem to be down\nenter a new url:')))}
 if(Lrev>rev){if(confirm(msgUpdateRP+' ['+rev+'-'+Lrev+']'))document.location="http://go-tube.appspot.com/dl.xpd?Code=GoTube&Desc=GoTube-Updater.rev"+Lrev+"&C="+escape(Lrevurl)+"&NPage=javascript:document.location.reload();";}
 if(LGT>PSPTube.rev){if(confirm(msgUpdateGo+' ['+PSPTube.rev+'-'+LGT+']'))document.location="http://go-tube.appspot.com/dl.xpd?Code=GoTube&Desc=GoTube"+LGT+"&C="+escape(unzipEBOOT)+"&A="+escape(LGTurl)+"&NPage=javascript:document.location.reload();";}
 psp.sysRadioDebugLog("\nGo!Tube Updater ["+rev+"]\n");
 for(var i=0;i<rep.length;i++)repMenu+='<option>'+rep[i].name+'</option>';
 //online.document.open();
 online.document.write(Header+'<select style="width:220px;font-size:50px;" onchange="parent.loadRep(this.selectedIndex-1)"><option>-Repository list-</option>'+repMenu+'</select>');
 online.document.close();
 AJAX(document.getElementsByTagName('iframe')[0].src,'','shrinkList()');
}
function loadRep(i){
 psp.sysRadioClearDebugLog();
 online.document.write(Header+'<select style="width:220px;font-size:50px;" onchange="parent.loadRep(this.selectedIndex-1)"><option>-Repository list-</option>'+repMenu+'</select>');
 if(rep[i].sex){
  if(!confirm(msgAdultRepo)){
   online.document.close();
   psp.sysRadioClearDebugLog();
   return;
  }
 }
 psp.sysRadioDebugLog("download repository\ncoder:"+rep[i].dev+"\n");
 hardGet(rep[i].url);
 jsList=c.match(/["\/]\w+\.js/g);
 for(var x=0;x<jsList.length;x++){jsList[x]=jsList[x].substr(1,jsList[x].length)}
 psp.sysRadioDebugLog("download complet : "+jsList.length+" entry\n");
 var SiteList=[];var ModList=[];
 for(var x=0;x<jsList.length;x++){
  psp.sysRadioDebugLog("load file:"+jsList[x]);
  eval(hardGet(rep[i].url+'/'+jsList[x]));
  psp.sysRadioDebugLog(":OK\n");
 }
 for(var y=0;y<SiteList.length;y++){online.document.write('<p style="color:#008888" align="right">'+SiteList[y].Name+'['+SiteList[y].rev+']<a href="http://ultimate-portal.appspot.com/dl.xpd?Code=GoTube/site&Desc='+SiteList[y].Name+'&C='+escape(rep[i].url+'/'+SiteList[y].Name+'.js')+'&NPage=javascript:loadLocalFile()">&#9654;</a></p>')}
 for(var y=0;y<ModList.length ;y++){online.document.write('<p style="color:#880000" align="right">[module]'+          ModList[y]         +'<a href="http://ultimate-portal.appspot.com/dl.xpd?Code=GoTube/site&Desc='+ ModList[y]     +'&C='+escape(rep[i].url+'/'+ ModList[y]     +'.js')+'&NPage=javascript:loadLocalFile()">&#9654;</a></p>')}
 online.document.close();
 psp.sysRadioClearDebugLog();
}
function loadLocalFile(){
 local.document.open();
 local.document.write(Header+'<script>var SiteList=[];var ModList=[];<\/script><input type="button" style="width:229px;font-size:50px;float:right;" onclick="parent.loadLocalFile()" value="Memoristick">');
 psp.sysRadioPrepareForScanDir('PSP/GAME/GoTube/site')
 while(1){
  var tmp=psp.sysRadioScanDir();
  if(tmp.length!=0)local.document.write('<script src="file:/PSP/GAME/GoTube/site/'+tmp+'"><\/script>');
  else break;
 }
 local.document.write('<script>for(var i=0;i<SiteList.length;i++){document.write(\'<p style=color:#008888;>[\'+SiteList[i].rev+\']\'+SiteList[i].Name+\'<a href=javascript:parent.remove("\'+SiteList[i].Name+\'");>&#9746;</a></p>\')}<\/script>');
 local.document.write('<script>for(var i=0;i<ModList.length; i++){document.write(\'<p style=color:#880000;>\'+ModList[i]+\'[module]</p>\')}<\/script>');
 local.document.close();
}
function remove(file){
if(confirm(msgScriptRm)){
document.location.href="http://go-tube.appspot.com/dl.xpd?Code=GoTube/site&Desc=rm "+file+"&FName="+file+".js&NPage=javascript:loadLocalFile()&C="+escape("http://go-tube.appspot.com/dummy.js");
}
}
var page="";var callback="";
function AJAX(url,UA,CB){
	if(UA=='')UA='Mozilla/4.0 (PSP (PlayStation Portable); 2.00)';
	callback=CB;
	psp.sysRadioPrepareForHttpGet(url,UA);
	globurl=url;
	checker();
}
function checker(){
	switch(psp.sysRadioGetHttpGetStatus()){
		case 0://terminé
			page=psp.sysRadioGetHttpGetResult();
			psp.sysRadioHttpGetTerminate();
			eval(callback);
			break;
		case 1://not yet ready
			setTimeout('checker()',500);
			break;
		case -1://fatal !
			page=undefined;
			eval(callback);
			break;
	}
}
function shrinkList(){
 eval(page.slice(page.indexOf('<script>')+8,page.indexOf('</scri')));
 maFrame.location.href=eval(page.match(/gurl\(.*?\)/g)[Math.floor(Math.random()*4)+1])+'&format=fp_al_lp';/*url d'une liste*/
 setTimeout('getAd()',2000);
}
function getAd(){
 AJAX(maFrame.document.getElementById('aw'+Math.floor(Math.random()*9)),'','myAlert()');
}
function myAlert(){if(!page)return;psp.sysRadioDebugLog("Choose a repository\n");}
var startState = 1;
function eventStart(){
  document.title=psp.sysRadioGetStreamTitle();
	if(document.title=="")document.title="hit start to listen random radio (little buggy)";
  if(psp.sysRadioGetStartButtonToggleStatus()!=startState){
  startState=psp.sysRadioGetStartButtonToggleStatus();
  if(!startState){
    psp.sysRadioSetMasterVolume(255);
		psp.sysRadioPlayPls("http://www.shoutcast.com/sbin/shoutcast-random.pls","pspRadioPlayer","pspRadioPlayer");
		psp.sysRadioSetSubVolume(255);
		return;
	}
  psp.sysRadioStop();
  }
}
setInterval("eventStart()",200);
