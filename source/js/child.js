var socket;
var config = {
	host: localStorage.host,
	port:localStorage.port,
	protocal:'websocket',
	name:'debuggap_child'
};

function init(){  
    var addr = "ws://" +config.host + ":" + config.port;
    var childName = location.href.match(/\?id=(.*)&url=(.*)/);
    if( !childName ){
    	window.location.href = "./index.html";
    } 
	if( config.name ){
		addr += ( "/"+config.name+childName[1] );
        document.title = decodeURIComponent(childName[2])+' : '+childName[1];
        window.uniqueId = childName[1];
	}
    try{  
        socket = new WebSocket(addr,config.protocal);
        socket.onopen    = function(msg){ 
			send("init:");
		};  
        socket.onmessage = function(msg){ 
			doDistribute(msg.data);
		};  
        socket.onclose   = function(msg){ 
        	job.doReady(false);
        };  
    } catch(ex) {  
        log(ex);  
    }  
}  

//socket buffer
var buffer = [];
var t =[];
function send(msg,vip){  
	if(vip){
		buffer.unshift(msg);
	}else{
		buffer.push(msg);
	}
   
   if( buffer.length > 1 && t.length ){
	   return;
   }
   var intval = setInterval(function(){
	   if( buffer.length == 0 ){
		   while( t.length ){
			   clearInterval(t.shift());
		   }
		   return;
	   }
	   var data = buffer.shift();
	   //console.log("doing the job:"+data);
	   data = encodeURIComponent(data);
	   socket.send(data);
   },30);
   t.push(intval);
}

function decodeData(data){
	var arr= [];
	for(var i=0;i<data.length;i+=2){
		arr.push( parseInt(data.charCodeAt(i).toString(16).substr(1,1) + data.charCodeAt(i+1).toString(16).substr(1,1),16) );
	}
	var mask = arr.splice(0,4);
	var j=0;
	var str = "";
	for( var i=0;i<arr.length;i++){
		str += String.fromCharCode( mask[j++%4] ^ arr[i] );
	}
	return str;
}

//receive the message
function doDistribute(data){
	//data = decodeData(data);
	data = decodeURIComponent(data);
	var index = data.indexOf(":");
	if( index < 1 ){
		return;
	}
	var type= data.substring(0,index);
	data = data.substring(index+1);
	
	var action = "do"+type[0].toUpperCase()+type.substring(1);
	try{
		job[action](data);
	}catch(e){
		var gui = require('nw.gui');
		if( gui.App.manifest.window.developing ){
			alert(e.message);
			console.log(e);
		}
	}
	if( -1 != $.inArray(type,['cookie','localStorage','sessionStorage']) ){
		job.refreshDisplay(type);
	}else if( -1 != $.inArray(type,['fileStart','fileEnd','css','js']) ){
		
	}
}
//send the message
function toDistribute(data){
	var arr = data.split(":");
	var action = arr[0];
	var data = arr[1];
	var action = "to"+action[0].toUpperCase()+action.substring(1);
	job[action](data);
}
//deal with the incoming message
var job = {};

//store device information
var deviceInfo = {};

job.doReady = function(d){
	if( d+'' == "true" ){
		log("Connect Successfully");
	}else{
		log("Disconnected",0);
		setTimeout(function(){
			init();
		},100);
	}	
}

job.doDeviceInfo = function(str){
	deviceInfo.userAgent = str;

	var rt = 'webkit';
	if( /ipad|iphone/i.test(str) ){
		rt = 'safari';
	}else if( /chrome/i.test(str) ){
		rt = 'chrome';
	}else if( /\.NET|MSIE/i.test(str) ){
		rt = 'ie';
	}
	deviceInfo.browser = rt;
}

function initAction(){
	
	initGlobalEvent();
	
	/* ---- head -----*/
	initHead();
	
	/* ---- elements ----*/
	initElement();

    /* ---- network ----*/
    initNetwork();
	
	/* --- resource-----*/
	initResource();
	
	/* --- source -----*/
	initSource();
	
	/*------console --------*/
	initConsole();
}


$(document).ready(function(){
	init();
	initAction();
})