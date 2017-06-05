function htmlspecialchars(str)  
{  
	var s = "";
	if( str == undefined ){
		return 'undefined';
	}else if( typeof str == 'number' ){
		return str+'';
	}else if ( str.length == 0){
		return '""';
	}

	for   (var i=0; i<str.length; i++)
	{
		switch (str.substr(i,1))
		{
			case "<": s += "&lt;"; break;
			case ">": s += "&gt;"; break;
			case "&": s += "&amp;"; break;
			case " ": s += " &nbsp;";break;
			case "\"": s += "&quot;"; break;
		   // case "\n": s += "<br>"; break;
			default: s += str.substr(i,1); break;
		}
	}
	return s;
}

function httpGet(option,callback,fail){
	var http = require('http');
	http.get(option,function(res){
		var data = new Buffer(0);
		res.on('data', function (chunk) {
			data =  Buffer.concat([data,chunk]);
		});

		res.on('end',function(){
			callback && callback(data.toString());
		});
		
		res.on('error',function(){
			callback && callback(null);
		});
	}).on('error',function(e){
		fail && fail(e);
	});
}

function getFilenameByUrl(url){
	if( !url ){
		return "";
	}else{
		var arr = url.split('/');
		return arr[arr.length-1];
	}
}

function log( str,time ){
	if( $('.msg').length == 0 ){
		var div = document.createElement("div");
		div.className = 'msg';
		document.body.appendChild(div);
	}
	$('.msg').text( str );
	$('.msg').css({'display':'block',opacity:1});
	time = typeof time == "undefined" ? 2000 : time;
	if( time ){
		setTimeout(function(){
			$('.msg').css({opacity:0});
			setTimeout(function(){
				$('.msg').css({display:"none"});
			},500);
		},time);
	}
}

/*
* focus_blur event
* when focus the specific element, it displays, otherwise, remove or hidden it.
*/
var focus_blur = {
	data:[],
	func:function(e){
		var target = $(e.target);
		var data = focus_blur.data,item;
		for( var i=0,len=data.length;i<len;i++){
			item = data[i];
			if(target.closest(item.selector).length == 0){
				if( item.blur ){
					item.blur(item.selector);
				}else{
					$(selector).hide();
				}
			}else{
				if( item.focus ){
					item.focus(item.selector);
				}
			}
		}
    },
	init:function(){
		$(document).bind('click',focus_blur.func);
	},
	register:function(selector,blur,focus){
		if( !focus_blur.data.length ){
			focus_blur.init();
		}
		for( var i=0,len=focus_blur.data;i<len;i++){
			if( data[i].selector == selector ){
				break;
			}
		}
		if( i == len ){
			focus_blur.data.push({selector:selector,focus:focus || null,blur:blur || null});
		}
	},
	unregister:function(selector){
		if( selector ){
			var data = focus_blur.data;
			for( var i=0,len=data.length;i<len;i++ ){
				if( data[i].selector == selector ){
					data.splice(i,1);
					break;
				}
			}
		}else{
			focus_blur.data = [];
		}
		if( !focus_blur.data.length ){
			$(document).unbind('click',focus_blur.func);
		}
	}
}

utility = {
	isMouseover:function(obj,e){
		var rt = false;
		if( e.srcElement ){
			rt = obj.contains(e.srcElement) && !obj.contains(e.fromElement);
		}else{
			rt = obj.contains(e.target) && !obj.contains(e.relatedTarget);
		}
		return rt;
	},

	isMouseout:function(obj,e){
		var rt = false;
		if( e.srcElement ){
			rt = obj.contains(e.srcElement) && !obj.contains(e.toElement);
		}else{
			rt = obj.contains(e.target) && !obj.contains(e.relatedTarget);
		}
		return rt;
	}
}