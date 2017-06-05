$(document).ready(function(){
  
  nw.Window.get().on('close', function () {
    if (dgServerInstance) {
      dgServerInstance.destroy()
    }
    nw.Window.get().close(true)
  });

	//get version of DebugGap
	document.title += " v"+manifest.version;
	getIP(function(ip){
		var nowTime = Math.ceil(new Date().getTime()/1000);
		if( (nowTime < localStorage.hostExpired) && localStorage.host && localStorage.port && (localStorage.previousIP == ip) ){
			config.host = localStorage.host
		}else{
			localStorage.previousIP = ip;
			config.host = ip;
		}

		if( localStorage.port ){
			config.port = localStorage.port; 
		}else{
			config.port = "11111";
		}
		if( !config.host ){
			config.host = localStorage.host;
		}

		$('.l-connect .ip').val( config.host );
		$('.l-connect .port').val( config.port );
	});

    $('.l-btn').on('click',function(){
        $(this).removeClass('l-btn-show');
        $('.l-console').removeClass('l-console-hide');
        $('.l-btn').removeClass('l-btn-err');
    });

    //start service
    $('.l-connect .connect').on('click',function(){

        config.host = $('.l-connect .ip').val();
        config.port = $('.l-connect .port').val();

		if( !( config.host && config.port ) ){
			return;
		}
        $('.l-connect').addClass('l-connect-action');
        startServer();
        setTimeout(function(){
            $('#clientList').show();
            initSocket();
            $('.l-console').removeClass('l-console-action');
            setTimeout(function(){
                $('.l-btn').addClass('l-btn-show');
                $('.l-console').addClass('l-console-hide');
                addOnBlurEvent();
            },2000);
        },1000);
    });

    //load the tracking page
    trackClass.init();

});

var dgServerInstance = null
var socket;
var config = {
    protocal:'websocket',
    name:'debuggap_index'
};

function getIP(fn){
	var exec = require('child_process').exec;
	exec('ipconfig',function(error,stdout){
		if( error ){
			exec('ifconfig',function(error,stdout){
				try{
					var arr = stdout.match(/inet addr:(\S+)/);
					var ip;
					if( arr && arr[1]){
						ip = arr[1];
					}else{		
						arr = stdout.match(/inet\s(\S+)/g);
						for(var i=0;i<arr.length;i++){
							ip = arr[i].match(/inet.*?([0-9.]+)/)[1];
							if( ip != '127.0.0.1' ){
								break;
							}
						}
					}
				}catch(e){
				}finally{
					fn(ip);
				}
			});
		}else{
			var ip= stdout.match(/IPv4[^:]+:\s*(\S+)/)[1];
			fn(ip);
		}
	});
};

function initSocket(){
    var addr = "ws://" +config.host + ":" + config.port;
    if( config.name ){
        addr += ( "/"+config.name );
    }
    try{
        socket = new WebSocket(addr,config.protocal);
        socket.onopen    = function(msg){
			localStorage.host = config.host;
			localStorage.port = config.port;
			localStorage.hostExpired = Math.ceil(new Date().getTime()/1000) + 60*60*3;
            addLog("Server is ready to receive remote mobile devices");
        };
        socket.onmessage = function(msg){
            addLi(msg.data);
        };
        socket.onclose   = function(msg){
            addLog("There is something wrong with your machine,please check your network/IP or firewall",'error');
            cleanPage();
        };
		daemon();
    } catch(ex) {
        log(ex);
    }
}

function daemon(){
	setTimeout(function(){
		if( socket.readyState != 1 ){
			addLog("Your machine is too slow to run DebugGap,please wait...");
		}
	},3000);
}

function startServer(){
  dgServerInstance = new DgServer();
  dgServerInstance.start(config.host,config.port);
}

var count = 0;
function addLi( str ){

    var str = decodeURIComponent(str).split("_debuggap_");
    var name = str[0];
	if( str[1] == 'close' ){
		if( $('#'+name).length ){
			$('#'+name).remove();
			$('h3 span').html(--count);
		}
	}else if( !$('#'+name).length ){
	    var userAgent = str[1];
		var str = '<li id="'+name+'">'+
		          '<a target="_blank" onclick="window.open(\'./child.html?id='+name+'&url='+encodeURIComponent(str[2])+'\')" href="javascript:void(0)">'+
		          '<b>ID</b>: '+str[0]+'<hr/>'+
		          '<b>URL</b>:<br/> '+str[2]+'<br/><br/>'+
		          '<b>Device Info</b>:<br/> '+str[1]+'</a></li>';
		$('#list').append(str);
		$('h3 span').html(++count);
	}

	trackClass.track( trackClass.filterPlatform(userAgent) );
}

function cleanPage(){
    $('h3 span').html(0);
    $('#list').html("");
}

function addOnBlurEvent(){

    focus_blur.register('.l-console',function(){
        $('.l-btn').addClass('l-btn-show');
        $('.l-console').addClass('l-console-hide');
    });
}

function addLog(str,type){
    str = str.replace(/\\n/g,'<br/>');
    if( type ){
        if( type == "error" ){
            str = '<span class="l-con-err">'+ str +'<span>';
            $('.l-btn').addClass('l-btn-err');
        }else if( typeof type == 'object' ){
            var style = '';
            jQuery.each(type,function(index,value){
                style += index +':'+value+';';
            });
            style = style.slice(0,-1);
            str = '<span style="'+style+'">'+ str +'<span>';
        }
    }
    str = '<pre>'+ str +'</pre>';
    var len = $('.l-con pre').length;
    if( len > 100 ){
        len = len - 100;
        $('.l-con pre:lt('+len+')').remove();
    }
    $('.l-con').append(str);
    $('.l-con')[0].scrollTop = 9999;
}

var trackClass = {
    init:function(){
        var str = '<div id="track" style="display:none;"><iframe src="http://www.debuggap.com/tooltrack/index.html" style="display:none;"></iframe></div>';
        $(document.body).append(str);
    },

    track:function(platform){
        var trackEvent = $('#track iframe')[0].contentWindow.trackEvent;

        if( !trackEvent ){
            return;
        }
        trackEvent(['_setCustomVar', 1, 'mobileSystem', platform, 1]);
    },

    filterPlatform:function(userAgent){
        var rt = 'webkit';
        var version = userAgent.match(/Android\s([0-9.]+)/);
        if( /ipad|iphone/i.test(userAgent) ){
            rt = 'safari';
            version = userAgent.match(/OS\s([0-9_]+)/);
        }else if( /chrome/i.test(userAgent) ){
            rt = 'chrome';
        }else if( /\.NET|MSIE/i.test(userAgent) ){
            rt = 'ie';
            version = null;
        }
        if( version && version[1]){
            rt += ' '+version[1];
        }
        return rt;
    }
}
