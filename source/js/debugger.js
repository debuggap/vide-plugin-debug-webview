/*
*	DGDebugger Class
*/
var DGDebuggerClass = function(debugUrl,url){

	this.url = url;
	this.debugUrl = debugUrl;
	this.socket = new WebSocket(debugUrl);
	var self = this;
	this.socket.onopen= function(data){
		//console.log('open:',data);
		self.init();
	}

	this.socket.onmessage= function(msg){
		//console.log('message:',JSON.parse(msg.data),msg.data);
		self.parseMessage(msg.data);
	}

	this.socket.onclose= function(data){
		console.log('close:',data);
		self.closed && self.closed();
	}

	//flag to detect the function
	this.flag = {
		remotework:0,
		console:0,
		debug:0,
		runtime:0,
		network:0
	}

	//listeners of callback for sending message
	this.listeners ={};

	this._script = {};

	this._breakpointIds={};

	this._watchExpression=[];

	this._singleDebugActive=false;

	this.commandId = 1;
}

DGDebuggerClass.prototype = {

	//parse function for websocket message
	parseMessage:function(data){
		data = JSON.parse(data);
		var method = data.method;
		if( method ){
			method = method.split('.').slice(1)[0];
			var fun = this[ "do"+method.replace(/^./,function(a){return a.toUpperCase();}) ];
			if( fun ){
				fun.call(this,data.params);
			}else{
				//console.warn(method+" is missing");
			}
		}else if( data.id ){
			var fun = this.listeners[data.id];
			if( fun ){
				fun.call(this,data);
				this.listeners[data.id] = null;
				delete this.listeners[data.id];
			}
		}
	},

	//initialize the websocket
	init:function(){
		this.send({method:'Worker.canInspectWorkers'},function(data){
			try{
				this.flag.remotework = data.result ? 1 : 0;
				/*
				*judge if this current page is the debugged page.
				*the program can receive the executionContextCreated message to handle it
				*/
				this.send({method:'Runtime.enable'});
			}catch(e){}
		});
		
	},

	initRemote:function(){
		this.send({method:'Console.enable'},function(data){
			this.flag.console = data && data.result ? 1 : 0;
		});
		this.send({method:'Debugger.enable'},function(data){
			this.flag.debug = data && data.result ? 1 : 0;
		});
		this.send({method:'Network.enable'},function(data){
			this.flag.network = data && data.result ? 1 : 0;
		});


		//get the Resource Tree
		/*
		this.send({method:'Page.getResourceTree'},function(data){
			remoteFileTree.doFileTree(data);
		});
		*/
	},

	close:function(){
		this.socket.close();
	},

	start:function(){
		remoteSocket.startADB();
	},

	/*
	* description: send the message to remote server
	* params:data
	* params:callback
	*/
	send:function(data,callback){
		data.id = this.commandId ++;
		callback && ( this.listeners[data.id] = callback );
		//console.log("send:",data);
		this.socket.send(JSON.stringify(data));
	},

	/*
	*----------------------------------------------------------------
	* the following functions are dealing with the coming message
	*----------------------------------------------------------------
	*/
	
	//parse the script
	doScriptParsed:function(data){
		if( data.url ){
			this._script[data.scriptId] = data;
		}
	},

	doPaused:function(data){
		this._singleDebugActive = true;
		debuggerTool.setDebugActive(true);
		debuggerTool.setChangeByPause(data);
		this.send({method:'Debugger.setOverlayMessage',params:{message:'DebugGap is debugging'}});
		//show the source tree
		$('.head li[targetid="sources"]').trigger('click');
	},

	doResumed:function(){
		this._singleDebugActive = false;
		debuggerTool.setDebugActive(false);
		debuggerTool.clearDebugStatus();
		this.send({method:'Debugger.setOverlayMessage'});
	},

	doMessageAdded:function(data){
		debuggerTool.addConsoleMessage(data.message);
	},

	doMessageRepeatCountUpdated:function(data){
		debuggerTool.consoleRepeat(data.count);
	},

	doExecutionContextCreated:function(data){
		if( data.context && this.flag.runtime != 1 ){
			this.flag.runtime = 1;
			this.send({method:'Runtime.evaluate',params:{
				contextId: data.context.id,
				doNotPauseOnExceptionsAndMuteConsole: false,
				expression: "navigator.userAgent",
				generatePreview: true,
				includeCommandLineAPI: true,
				objectGroup: "console",
				returnByValue: false
			}},function(data){
				if( data && data.result ){
					var agent = data.result.result.value;
					var _crypto = require('crypto');
					var uniqueId = _crypto.createHash('md5').update( agent+this.url ).digest('hex');
					var childName = location.href.match(/\?id=(.*)&url=(.*)/);
					if( childName[1] == uniqueId ){
						if( debuggerTool.initFlag ){
							debuggerTool.setDebugInfo('debugReload');
							return;
						}
						this.flag.remotework = 1;
						//init other setting.
						this.initRemote();
						DGDebugger = this;

						//put this function here, to run it where real connecting socket is closed.
						DGDebugger.closed = function(){
							//if socket is closed,disable the debug panel.
							debuggerTool.debuggerDisabled();
						}

						//enbale overwrite
						debuggerTool.consoleEnabled();
						debuggerTool.debuggerEnabled();
						debuggerTool.networkEnabled();
						debuggerTool.initFlag = 1;

					}else{
						this.flag.remotework = 0;
						//close the socket;
						this.close();
					}
				}
			});
		}
	},

	doRequestWillBeSent:function(data){
		debuggerTool.initRequest(data);
	},

	doResponseReceived:function(data){
		debuggerTool.resultRequest(data);
	},

	doDataReceived:function(data){

	},

	/*
	*--------------------------------------------------------------
	* the following functions are dealing with the sending message
	*--------------------------------------------------------------
	*/
	

	//set the breakpoint
	setBreakpointByUrl:function(params,callback){
		this.send(params,function(data){
			if( data && data.result ){
				this._breakpointIds[data.result.breakpointId] = data.result.locations;
				callback && callback(data.result);
			}	
		});
	},

	//remove the breakpoint
	removeBreakpoint:function( params,callback ){
		this.send(params,function(data){
			if( data && data.result ){
				this._breakpointIds[params.params.breakpointId] = null;
				delete this._breakpointIds[params.params.breakpointId];
				callback && callback(data);
			}	
		});
	},

	setBreakpointsActive:function(value,callback){
		var data = {
			method:'Debugger.setBreakpointsActive',
			params:{
				active:value ? true : false
			}
		}
		this.send(data,function(data){
			callback && callback(data);
		});
	},

	getScriptSource:function(ids,callback){
		var len = ids.length,con=[];
		for( var i=0;i<ids.length;i++ ){
			var id = ids[i];
			var data = {
				method:'Debugger.getScriptSource',
				params:{scriptId:id+""}
			};
			this.send(data,function(data){
				con.push(data);
				if( --len == 0 ){
					callback && callback(con);
				}
			});
		}
	},

	evaluateOnCallFrame:function( watch, env, callback ){
		var data = {
			method:'Debugger.evaluateOnCallFrame',
			params:{
				callFrameId:env,
				expression:watch.watch,
				objectGroup:"watch-group",
				includeCommandLineAPI:false,
				doNotPauseOnExceptionsAndMuteConsole:true,
				returnByValue:false,
				generatePreview:false
			}
		}
		this.send(data,function(data){
			callback(data,watch.watchIndex);
		});
	},

	evaluate:function( watch, callback ){
		var data = {
			method:'Runtime.evaluate',
			params:{
				expression:watch.watch,
				objectGroup:"watch-group",
				includeCommandLineAPI:false,
				doNotPauseOnExceptionsAndMuteConsole:true,
				returnByValue:false,
				generatePreview:false
			}
		}
		this.send(data,function(data){
			callback(data,watch.watchIndex);
		});
	},

	//get properties of watch value
	getProperties:function(objectId,callback){
		var data = {
			method:'Runtime.getProperties',
			params:{
				objectId:objectId,
				ownProperties:true,
				accessorPropertiesOnly:false
			}
		};
		this.send(data,function(data){
			callback(data.result.result);
		});
	},

	//resume the debugger
	resume:function(){
		var data = {
			method:'Debugger.resume'
		}
		this.send(data);
	},

	//stepInto the debugger
	stepInto:function(){
		var data = {
			method:'Debugger.stepInto'
		}
		this.send(data);
	},

	//stepOut the debugger
	stepOut:function(){
		var data = {
			method:'Debugger.stepOut'
		}
		this.send(data);
	},

	//stepOver the debugger
	stepOver:function(){
		var data = {
			method:'Debugger.stepOver'
		}
		this.send(data);
	}
};

DGDebugger = null;

/*
*---------------------------------------
* tool for debugger
*---------------------------------------
*/
var debuggerTool ={

	//init flag
	initFlag:0,

	//Section 1: debug
	currentDebugger:null,
	_singleStepDebug:false,
	setDebugActive:function(value){
		var self = this;
		this._singleStepDebug = value;
		if( !value ){
			arguments.callee.timeoutIndex = setTimeout(function(){
				self.refreshWatchExpression();
			},500);
		}else{
			clearTimeout(arguments.callee.timeoutIndex);
		}
		//set the status to single-step button
		value = value ? 1 : 0.1;
		$('#sources .breakpoint-action input:lt(4)').css({opacity:value});
	},

	setBreakpointByUrl:function(lineNum,url){
		var self = this;
		var data = {
			method:'Debugger.setBreakpointByUrl',
			params:{
				url:url,
				lineNumber:parseInt(lineNum)
			}
		}
		DGDebugger.setBreakpointByUrl(data,function(data){
			var new_lineNum = lineNum;
			if( data.locations[0] ){
				new_lineNum = data.locations[0].lineNumber;
			}
			var id = $('#sources .s-ul li.li-active').attr('target');
			var obj = $('#sources #'+id).find('span[_id=codenum'+new_lineNum+']');
			obj.addClass('blue');
			obj.attr('breakpointId',data.breakpointId);
			self.resetBreakpointList();
		});
	},

	removeBreakpoint:function(obj){
		var self = this;
		var breakpointId = $(obj).attr('breakpointId');
		var data = {
			method:'Debugger.removeBreakpoint',
			params:{breakpointId:breakpointId}
		}
		DGDebugger.removeBreakpoint(data,function(data){
			$(obj).removeClass('blue');
			$(obj).removeAttr('breakpointId');
			self.resetBreakpointList();
		});
	},

	resetBreakpointList:function(){
		var breakpointList = DGDebugger._breakpointIds;
		var str = "";
		for( var i in breakpointList ){
			var arr = i.split('/');
			var obj = breakpointList[i][0];
			var con = arr[arr.length-1];
			if( con[0] == ":" ){
				con = "(index)"+con;
			}
			con = con.replace(/:(.*?):/,function(a,b){return ":"+(parseInt(b)+1)+":";});
			str += '<li _location="'+obj.scriptId+':'+obj.lineNumber+'">'+con+'</li>';
		}
		if( str ){
			str = "<ul>"+str+"</ul>";
			$('#valueWatch .break-point').html(str);
			//display the callback section
			$('#valueWatch .break-point').show();
			$('#valueWatch .break-point').prev().find('span').addClass('down');
		}else{
			$('#valueWatch .break-point').html("");
		}
	},

	_callFrames:[],
	setChangeByPause:function(data){
		this._callFrames = data.callFrames;
		var location = data.callFrames[0].location;
		this.setLineBackground(location.scriptId,location.lineNumber);
		this.showCallStack(this._callFrames);
	},

	showCallStack:function(callFrames){
		var str = "";
		for( var i=0;i<callFrames.length;i++){
			var obj = callFrames[i];
			if( DGDebugger._script[obj.location.scriptId] ){
				var arr = DGDebugger._script[obj.location.scriptId].url.split('/');
				var con = arr[arr.length-1];
				if( con == "" ){
					con = "(index)"+con;
				}
				if( !obj.functionName ){
					obj.functionName = '(anonymous function)';
				}
				str += '<li _callFrameId="'+encodeURIComponent(obj.callFrameId)+'" _location="'+obj.location.scriptId+':'+obj.location.lineNumber+'">'+obj.functionName+"<span>"+con+":"+(obj.location.lineNumber+1)+"</span></li>";
			}
		}
		if( str ){
			str = "<ul>"+str+"</ul>";
			$('#valueWatch .call-stack').html(str);
			$('#valueWatch .call-stack li').first().addClass('active');
			//display the callback section
			$('#valueWatch .call-stack').show();
			$('#valueWatch .call-stack').prev().find('span').addClass('down');

			//show the value of watch expression according to different callFrameId
			this.evaluateOnCallFrame(callFrames[0].callFrameId);
		}
	},
	
	clearDebugStatus:function(){
		if( this._preLineObject ){
			this._preLineObject.removeClass("blue");
		}
		// clear the call stack
		$('#valueWatch .call-stack').html("");
	},
	_preLineObject:null,
	setLineBackground:function(scriptId,lineNumber){

		if( this._preLineObject ){
			this._preLineObject.removeClass("blue");
		}
		var self = this;
		this.getFileConById(scriptId,function(){
			var id = $('#sources .s-ul li.li-active').attr('target');
			self._preLineObject = $('#sources #'+id).find('div[_id=codeline'+lineNumber+']');
			self._preLineObject.addClass("blue");

			//scroll the page for the correct position
			var top = 0;
			var target = document.getElementById(id);
			var topLine = Math.ceil(target.scrollTop/14);
			if( !( topLine < lineNumber && lineNumber < (topLine+50)) ){
				top = (lineNumber - 25 )*14;
				if( top < 0 ){
					top = 0;
				}
				target.scrollTop = top;
			}
		});
	},

	showBreakpointLine:function(scriptId,lineNumber){
		var self = this;
		this.getFileConById(scriptId,function(){

			//scroll the page for the correct position
			var id = $('#sources .s-ul li.li-active').attr('target'),top = 0;
			var target = document.getElementById(id);
			var topLine = Math.ceil(target.scrollTop/14);
			if( !( topLine < lineNumber && lineNumber < (topLine+50)) ){
				top = (lineNumber - 25 )*14;
				if( top < 0 ){
					top = 0;
				}
				target.scrollTop = top;
			}
		});
	},

	//when in the single-step debug, restore the current env.
	_onCallFrameEvn:'',
	evaluateOnCallFrame:function(env){
		this._onCallFrameEvn = env;
		var watches = DGDebugger._watchExpression,watch;
		var len = watches.length;
		for( var i=0;i<watches.length;i++){
			this._evaluateOnCallFrame( watches[i],function(){
				if( --len == 0 ){
					//refresh the expend value
					$.each($('#sources .watch .e-rt.down'),function(){
						debuggerTool.getProperties($(this).attr('_objectId'));
					});
				};
			});
		}
	},
	
	_evaluateOnCallFrame:function(watch,callback){
		var self = this;
		DGDebugger.evaluateOnCallFrame(watch,this._onCallFrameEvn,function(data,id){
			self._handleEvaluateOnCallFrame(data,id);
			callback && callback();
		});
	},

	evaluate:function(){
		var watches = DGDebugger._watchExpression,watch;
		for( var i=0;i<watches.length;i++){
			this._evaluate(watches[i]);
		}
	},

	_evaluate:function(watch){
		var self = this;
		DGDebugger.evaluate(watch,function(data,id){
			self._handleEvaluate(data,id);
		});
	},

	_handleEvaluateOnCallFrame:function(data,id){
		if( data.result ){
			var result = data.result.result,value;
			var obj = $('#sources #watchValue'+id);
			if( result.objectId && result.className != 'ReferenceError' ){
				var prev = obj.parent().prev();
				prev.removeClass('e-empty');
				prev.addClass('e-rt');
				prev.attr('_objectId',encodeURIComponent(result.objectId));
			}
			if( result.type == 'string' ){
				value = result.value;
				obj.text('"'+value+'"');
				obj.attr('title',value);
			}else if( result.type == 'number' ){
				value = result.value;
				obj.text(value);
				obj.attr('title',value);
            }else if( result.type == 'object' ){
				if( result.className == 'ReferenceError' ){
					obj.text('undefined');
				}else{
					obj.text(result.description);
				}

			}else if( result.type == 'undefined' ){
				obj.text('undefined');
			}
		}
	},
	
	_handleEvaluate:function(data,id){
		if( data.result ){
			var result = data.result.result,value;
			var obj = $('#sources #watchValue'+id);
			if( result.objectId && result.className != 'ReferenceError' ){
				var prev = obj.parent().prev();
				prev.removeClass('e-empty');
				prev.addClass('e-rt');
				prev.attr('_objectId',encodeURIComponent(result.objectId));
			}
			if( result.type == 'string' ){
				value = result.value;
				obj.text('"'+value+'"');
				obj.attr('title',value);
			}else if( result.type == 'object' ){
				if( result.className == 'ReferenceError' ){
					obj.text('undefined');
				}else{
					obj.text(result.description);
				}

			}else if( result.type == 'number' ){
				obj.text(result.value);
			}
		}
	},
	
	_handleWatchProperties:function(width,data){
		var arrow = '<span class="e-empty"></span>',value;
		var valueObj = data.value ? data.value : data.set;
		if( valueObj.objectId ){
			arrow = '<span class="e-rt" _objectId="'+encodeURIComponent(valueObj.objectId)+'"></span>';
		}
		switch( valueObj.type ){
			case 'string': value = '"'+htmlspecialchars(valueObj.value)+'"';break;
			case 'function':;
			case 'number':;
			case 'object': value = valueObj.description;break;
		}
		if( !value ){
			value = valueObj.description ? valueObj.description : valueObj.value;
		}
		var str = '<li><div class="e-tl"><span class="e-sp" style="width:'+width+'px">'+
			'</span>'+arrow+'<div class="e-ele"><span>'+data.name+'</span> : <span class="watch-value" title=\''+value+'\'>'+value+'</span></div></div></li>';
		return str;
	},

	getProperties:function(objectId){
		var self = this;
		DGDebugger.getProperties(decodeURIComponent(objectId),function(data){
			var arrowObj = $('#valueWatch span[_objectId="'+objectId+'"]');
			var liObj = arrowObj.parent().parent();
			var width = parseInt( arrowObj.prev().css('width') ) + 10;
			var str = "";
			for( var i=0;i<data.length;i++){
				str += self._handleWatchProperties(width,data[i]);
			}
			if( str ){
				liObj.find('ul').remove();
				str = '<ul>'+str+'</ul>';
				liObj.append(str);
			}
		});
	},

	//Section 2: console

	addConsoleMessage:function(msg){
		var urlLine = '';
		if( msg.url ){
			urlLine = getFilenameByUrl(msg.url)+':'+msg.line;
		}
		//if this log is a object,throw general console function to deal with
		if( msg.parameters && msg.parameters[0].type == 'object' ){
			return;
		}
		job._addConsoleLogFromDebugger(msg.text,msg.level,urlLine);
	},

	consoleRepeat:function(count){
		job.trRepeat(count);
	},

	//Section 3: network
	_requestIds:{},
	initRequest:function(data){
		var url = data.request.url;
		if( /scriptSocket/.test(url) ){
			return;
		}
		var _url = require('url');
		var request = {
			id:new Date().getTime()*1000 + Math.floor(Math.random()*1000),
			location:_url.parse(url),
			method:data.request.method,
			requestHeaders:data.request.headers,
			integrated:1//it's used for judgment in the network.js
		}
		if( data.request.postData ){
			request.payload = data.request.postData;
		}
		this._requestIds[data.requestId] = request.id;
		job.doInitRequest( JSON.stringify(request) );
	},

	resultRequest:function(data){
		var _url = require('url');
		var response = data.response;
		if( /scriptSocket/.test(response.url) ){
			return;
		}
		var url = _url.parse(response.url);
        var response ={
			id:this._requestIds[data.requestId],
			data:'',
			host:url.host,
			pathname:url.pathname,
			responseHeaders:response.headers,
			size:0,
			statusCode:response.status,
			times:parseInt(response.timing.receiveHeadersEnd-response.timing.sendStart),
			integrated:1
		}
		//get the body content
		DGDebugger.send({method:'Network.getResponseBody',params:{requestId:data.requestId}},function(data){
			if( /\.(jpg|jpeg|gif|png|bmp)$/.test(response.pathname.toLowerCase()) ){
				response.size = response.data.length;
				response.responseHeaders['Content-Type'] = 'image/';
				delete response.data;
			}else{
				response.data = data.result.body.toString('utf8');
				response.size = Buffer.byteLength(response.data);
			}

			job.doResultRequest(JSON.stringify(response));
		});
	},

	/*
	* ----------------------------------------------------------------
	* if network is enabled,do some specific thing, like overwriting.
	* ----------------------------------------------------------------
	*/
	networkEnabled:function(){

	},

	/*
	* ----------------------------------------------------------------
	* if single-step debug is enabled,do some specific thing, like overwriting.
	* ----------------------------------------------------------------
	*/
	debuggerEnabled:function(){
		//overwrite some functions
		this.overwriteFunctionsForDebugger();
		
		//add the addingBreakpoint function
		this.addBreakpointFun();

		//remove the spinenr for the single step section
		this.activeSingleStep();

		//add the change event for the debug item
		this.addArrowFunForDebugItem();

		//add the expend function of watch value
		this.addArrowFunForWatch();

		//add the remove watch functionality
		this.addRemoveFunForWatch();

	},

	overwriteFunctionsForDebugger:function(){
		// this function copy from debuggap.js to deal with the file tree
		var remoteFileTree ={
			/*
			* overwrite the job.doFileTree
			* if will speed up to the get the source.
			*/
			doFileTree:function(data){
				if( !( data && data.result && data.result.frameTree) ){
					return;
				}
				var _url = require('url');
				var frame = data.result.frameTree.frame;
				var files = data.result.frameTree.resources;
				var url = _url.parse(frame.url);
				//set the file pre
				this._doFileStart(url.href.replace(url.hash,''));

				//set the file value

				for( var i=0;i<files.length;i++){
					this._doFile(files[i].url);
				}
				//send the files
				var con = [this._sPre,this._sTitle,this._sFiles];
				job.doFileTree( JSON.stringify(con) );
			},
			_doFile:function(file){
				//console.log(file);
				file = file.replace(this._sPre,"");
				file = file.split("/");
				var arr = this._sFiles;
				if( file.length == 1 ){
					arr.push(file[0]);
				}else{
					for( var i=0;i<file.length-1;i++){
						var dirIndex = file[i];
						var arrLen = arr.length;
						var hasDir = false;
						for( var j=0;j<arrLen;j++){
							if( typeof arr[j] !='string' && arr[j][dirIndex] ){
								arr = arr[j][dirIndex];
								hasDir = true;
								break;
							}
						}
						if( !hasDir ){
							var subFile = file.slice(i,-1);
							arr = this._sCreateTree(arr,subFile);
							break;
						}
					}
					arr.push(file[file.length-1]);
				}
				arr.sort(function(a,b){if(a>b)return 1;else return -1;});
			},
			_sCreateTree:function(arr,subFile){
				for( var i=0;i<subFile.length;i++){
					var tmp = {};
					tmp[subFile[i]] = [];
					var len = arr.push(tmp);
					var arrTemp = arr;
					arr = arr[len-1][subFile[i]];
					arrTemp.sort(function(a,b){
						var aStr = typeof a == "string";
						var bStr = typeof b == "string";
						if( aStr && bStr ){
							if( a > b)return -1;else return 1;
						}else if( aStr ){
							return 1;
						}else if( bStr ){
							return -1;
						}else{
							if( Object.keys(a)[0] > Object.keys(b)[0])return -1;else return 1;
						}
					});
				}
				return arr;
			},
			_doFileStart:function(data){
				this._sPre = data.substring(0,data.lastIndexOf('/')+1);
				this._sFiles =[];
				this._sTitle = data.substring(data.lastIndexOf('/')+1);
			}
		};

		//change the machanism for get file content
		var preGetFilecon = job._getFileCon;
		job._getFileCon = function(filePath,callback){
			if( filePath.slice(-2) != 'js' ){
				preGetFilecon.call(job,filePath);
				callback && callback();
			}else{
				var fileId = filePath.replace(/(\.|\\|\/|:|%20)/g,"_").replace(/\?.+/,'');
				if( _source.file[fileId] ){
					job._addFileCon( fileId, _source.file[fileId] );
					callback && callback();
				}else{
					var ids = $.map(DGDebugger._script,function(a,b){if( a.url == filePath ){return b;}});
					DGDebugger.getScriptSource(ids,function(con){
						if( con.length ){
							job.doFileCon( filePath + "_dg_" +con[0].result.scriptSource );
						}
						//add the callback function once the file is loaded.
						callback && callback();
					});
				}
			}
			//add the breakpoint mark on the specific line
			setTimeout(function(){
				debuggerTool._addBreakpointMark(filePath);
			},100);
		}

	},

	addRemoveFunForWatch:function(){
		$('#valueWatch .watch').delegate('div.e-tl','mouseover',function(event){
			if( !$(this).find(event.srcElement).length && this != event.fromElement && $(this.parentNode.parentNode.parentNode).hasClass('watch') ){
				$(this).find('.watch-remove').remove();
				$(this).append('<span class="watch-remove"></span>');
			}
		});

		$('#valueWatch .watch').delegate('div.e-tl','mouseout',function(event){
			if( !$(this).find(event.toElement).length && this!=event.toElement && $(this.parentNode.parentNode.parentNode).hasClass('watch') ){
				$(this).find('.watch-remove').remove();
			}
		});

		$('#valueWatch .watch').delegate('.watch-remove','click',function(event){
			var obj = $(this).parents('li');
			var _watchIndex = parseInt(obj.attr('_watchIndex'));
			for( var i =0;i<DGDebugger._watchExpression.length;i++){
				if( DGDebugger._watchExpression[i].watchIndex == _watchIndex ){
					DGDebugger._watchExpression.splice(i,1);
					break;
				}
			}
			obj.remove();
		});
	},

	addArrowFunForWatch:function(){
		$('#valueWatch .watch').delegate('span.e-rt','click',function(){
			if( $(this).hasClass('down') ){
				$(this).removeClass('down');
				$(this).parent().next().remove();
			}else{
				$(this).addClass('down');
				var _objectId = $(this).attr('_objectId');
				debuggerTool.getProperties(_objectId);
			}
		});
	},

	addArrowFunForDebugItem:function(){
		$('#valueWatch .title').delegate('span.arrow','click',function(){
			if( $(this).hasClass('down') ){
				$(this).removeClass('down');
				$(this).parent().next().hide();
			}else{
				$(this).addClass('down');
				$(this).parent().next().show();
			}
		});
	},

	activeSingleStep:function(){
		$('#sources .hideWatch').hide();
		debuggerTool.setDebugActive(false);
	},

	addBreakpointFun:function(){
		var self = this;
		//bind for the add/remove breakpoint
		$('#sources #sTabs').delegate('span.num','click',function(){
			if( $(this).attr('breakpointid') ){
				self.removeBreakpoint(this);
			}else{
				var num = $(this).attr('_id').replace('codenum','');
				var src = $('#sources .s-ul li.li-active').attr('_src');
				self.setBreakpointByUrl(num,src);
			}
		});

		//bind for the single-step button
		$('#sources .breakpoint-action input').on('click',function(){
			/*
			if( !DGDebugger._singleDebugActive ){
				return true;
			}
			*/
			var value = $(this).attr('_value');
			var self = this;
			if( value == "setBreakpointsActive" ){
				if( $(this).hasClass('active') ){
					DGDebugger.setBreakpointsActive(false,function(){
						self.className = 'deactive';
					});
				}else{
					DGDebugger.setBreakpointsActive(true,function(){
						self.className = 'active';
					});
				}
			}else{
				DGDebugger[value]();
			};
		});

		//bind for the callstack
		$('#sources #valueWatch .call-stack').delegate('li','click',function(){
			var _location = $(this).attr('_location');
			_location = _location.split(':');

			//remove the active status for the former 
			$(this).parent().find('li').removeClass('active');
			//add current list active status
			$(this).addClass('active');

			self.setLineBackground(_location[0],_location[1]);
			
			//get the watch value in different callFrame.
			var _callFrameId = decodeURIComponent( $(this).attr('_callFrameId') );
			self.evaluateOnCallFrame(_callFrameId);

		});

		//bind for the breakpoint
		$('#sources #valueWatch .break-point').delegate('li','click',function(){
			var _location = $(this).attr('_location');
			_location = _location.split(':');
			self.showBreakpointLine(_location[0],_location[1]);
		});

		//bind for the 'watch-input-add' property
		var watchIndex = 1;
		$('#sources #valueWatch .watch .watch-input-add').on('keypress',function(event){
			if( event.charCode == 13 && $(this).val() ){
				//add the watch expression
				var watch = {watchIndex:watchIndex++,watch:$(this).val()};
				DGDebugger._watchExpression.push( watch );
				//add new watch to the list
				self.addNewExpression(watch);
			}
		});
		
		$('#sources #valueWatch .watch .watch-input-add').on('blur',function(event){
			$(this).val('');
		});
	},

	addNewExpression:function(watch){
		var str = '<li _watchIndex='+watch.watchIndex+'><div class="e-tl"><span class="e-sp" style="width:0px"></span><span class="e-empty"></span><div class="e-ele"><span>'+watch.watch+'</span> : <span class="watch-value" id="watchValue'+watch.watchIndex+'"></span></div></div></li>';
		$('#sources #valueWatch .watch ul:first').append(str);
		$('#sources #valueWatch .watch .watch-input-add').val('');
		if( this._singleStepDebug ){
			this._evaluateOnCallFrame(watch);
		}else{
			this._evaluate(watch);
		}
	},

	refreshWatchExpression:function(){
		var watches = DGDebugger._watchExpression;
		var str = "",watch;
		for( var i=0;i<watches.length;i++){
			watch = watches[i];
			str += '<li _watchIndex='+watch.watchIndex+'><div class="e-tl"><span class="e-sp" style="width:0px"></span><span class="e-empty"></span><div class="e-ele"><span>'+watch.watch+'</span> : <span class="watch-value" id="watchValue'+watch.watchIndex+'"></span></div></div></li>';
		}
		if( str ){
			$('#sources #valueWatch .watch ul:first').html(str);
			$('#sources #valueWatch .watch .watch-input-add').val('');
			//evaluate the watche expression
			this.evaluate();
		}				
	},

	getFileConById:function(id,callback){
		var self = this;
		if( !DGDebugger._script[id] ){
			console.error("there is no such file");
			return;
		}else if( DGDebugger._script[id].url == $('#sources .s-ul li.li-active').attr('_src') ){
			callback && callback();
			return;
		}
		//add the spinner
		$('#sources').showSpinner();
		var filePath = DGDebugger._script[id].url;
		var fileName = filePath.split('/');
		var fileName = fileName[fileName.length -1];
		if( fileName == "" ){
			fileName = "(index)";
		}
		var fileId = filePath.replace(/(\.|\\|\/|:|%20)/g,"_").replace(/\?.+/,'');
		//add the tab
		if( !$('#sTabs ul li[target="'+fileId+'"]').length ){
			tabTemplate = '<li target="'+fileId+'" _src="'+filePath+'"><a href="javascript:void(0)">'+fileName+'</a><span></span></li>';
			$('#sTabs ul').append( tabTemplate );
			
			var tempCallback = function(){
				//display content
				//fist hide all the componets and then show current
				$('#sTabs ul').children().removeClass('li-active');
				$('#sTabs').children().filter('div.file-con').hide();
				$('#sTabs ul li[target="'+fileId+'"]').addClass('li-active');
				$('#'+fileId).show();
				
				self._addBreakpointMark(filePath);
				callback && callback();
			}
			job._getFileCon(filePath,tempCallback);

		}else{
			//remove the spinner
			$('#sources').hideSpinner();

			//display content
			//fist hide all the componets and then show current
			$('#sTabs ul').children().removeClass('li-active');
			$('#sTabs').children().filter('div.file-con').hide();
			$('#sTabs ul li[target="'+fileId+'"]').addClass('li-active');	
			$('#'+fileId).show();

			callback && callback();
		}

	},

	_addBreakpointMark:function(filePath){
		//show the breakpoint marks
		var ids = $.map(DGDebugger._script,function(a,b){if( a.url == filePath )return b;});
		var breakpoints = $.map(DGDebugger._breakpointIds,function(a,b){
			if( a && $.inArray( a[0].scriptId,ids ) != -1 ){
				return {lineNumber:a[0].lineNumber,breakpointId:b};
			}
		});
		for( var i=0;i<breakpoints.length;i++){
			var data =breakpoints[i];
			var id = $('#sources .s-ul li.li-active').attr('target');
			var obj = $('#sources #'+id).find('span[_id=codenum'+data.lineNumber+']');
			obj.addClass('blue');
			obj.attr('breakpointId',data.breakpointId);
		}
	},

	/*
	* ----------------------------------------------------------------
	* if console is enabled,do some specific thing, like overwriting.
	* ----------------------------------------------------------------
	*/
	consoleEnabled:function(){
		//overwrite some functions
		this.overwriteFunctionsForConsole();

	},

	overwriteFunctionsForConsole:function(){
		//define empty function
		var emptyFun = function(){};
		var self = this;
		//overwrite the console-deal function
		$.extend(job,{
			//send the command to client
			/*
			_sendCommand:function(cmd){
				if( _console.history[0] != cmd ){
					_console.history.unshift(cmd);
					localStorage._consoleHistory = JSON.stringify( _console.history );
				}
				_console.curIndex = -1;
				
				//send the command
				var watch = {watch:cmd,watchIndex:1}
				var callback = function(data,id){
					var result = data.result.result;
					var con = result.value,type='log';
					if( result.className == 'ReferenceError' ){
						type = 'error';
						con = result.description;
					}else if( result.type == 'number' || result.type == 'string' ){
						con = result.value;
					}else if( result.type == 'object' || result.type == 'function' ){
						con = result.description;
					}
					job._addTr(con,type);
				}

				if( self._singleStepDebug ){
					DGDebugger.evaluateOnCallFrame(watch,self._onCallFrameEvn,callback);
				}else{
					DGDebugger.evaluate(watch,callback);
				}
				//clean the input
				$('#console .console-input').html("");
				this._addTr(cmd,'cmd');
			},
			*/
			//add a row
			_addConsoleLogFromDebugger:function(con,type,urlLine){

				var inputTr = $('.console-log table tr').last();
				var newTr = inputTr.clone(true);
				newTr.insertBefore(inputTr);
				
				con = htmlspecialchars(con);

				if( type == "cmd" ){
					con = '<span class="span-cmd">'+con+'</span>';
					type = '<span class="span-cmd-icon">></span>';
				}else if( type == "error" ){
					con = '<span class="span-error">'+con+'</span>';
					type = '<span class="span-error-icon"></span>';
				}else if( type == "warn" || type=="warning" ){
					con = '<span class="span-warning">'+con+'</span>';
					type = '<span class="span-warning-icon"></span>';
				}else{
					con = '<pre><span class="span-log">'+(con+'').replace(/\>/g,'&gt;').replace(/\</g,'&lt;')+'</span></pre>';
					type = "";
				}
				if( urlLine){
					con += '<span class="console-url-line">'+urlLine+'</span>';
				}
				newTr.children().last().html(con);
				newTr.children().last().addClass('td-hr');
				newTr.children().first().html(type);
				$('.console-log')[0].scrollTop=100000;

				//re-calulate the width of console
				job._refreshConsoleForPre();
			},
			trRepeat:function(count){
				var obj = $('.console-log table tr').last().prev().find('.left');
				var className = 'span-repeat '+ $('.console-log table tr').last().prev().find('td:last span:first').attr('class').replace(/-/,function(){return '-repeat-';});
				obj.html('<span class="'+className+'">'+count+'</span>');
			}
		});
	},

	setDebugInfo:function(index){
		$('#valueWatch .hideWatch ').html('<p>'+dgLanguage[index]+'</p>');
	},

	/*
	* ----------------------------------------------------------------
	* if debugger is Disabled,do some specific thing.
	* ----------------------------------------------------------------
	*/
	debuggerDisabled:function(){
		remoteSocket.start();
	}
};

/*--------------------------------------------------------
* connect to the integrated websocket to remote debug
*---------------------------------------------------------
*/

var remoteSocket ={
	socket:null,
	init:function(id){
		id = id ? id : 11114;
		var self = this;
		httpGet('http://localhost:'+id+'/json',function(data){
			data = JSON.parse(data);
			if( data&&data[0] ){
				var webSocketDebuggerUrl = data[0].webSocketDebuggerUrl;
				if( webSocketDebuggerUrl ){
					remoteSocket.initSocket(webSocketDebuggerUrl,data[0].url);
					//stop listen
					self.stopListener();
				}else{
					//alert("this page has been debugged by other tool");
				}
			}
		},function(e){
			console.log(e);
		});
	},

	start:function(){
		//show spinner
		$('#sources .hideWatch').show();

		var self = this;
		this.stopListener();
		this.adbInstance = setInterval(function(){self.startADB();},1000);
	},
	stopListener:function(){
		if( this.adbInstance ){
			clearInterval(this.adbInstance);
			this.adbInstance = null;
		}
	},
	startADB:function(){
		var exec = require('child_process').exec;
		var self = this;
		var port = parseInt(localStorage.port);
		var ports ={
			chrome:port+3,
			webview:port+4
		}

		//forward webview devtools
		exec('"./main/components/debuggap/modules/adb/adb_'+platforms.adb+'/adb" jdwp > ./main/components/debuggap/webview.txt &',function(error, stdout, stderr){
			if( !error && stdout ){
				//nothing
			}else if( /not found/.test(stderr) ){
				debuggerTool.setDebugInfo('detectError');
			}
		});
		setTimeout(function(){
			//get the process_id
			var fs = require('fs');
			var stdout = fs.readFileSync('./main/components/debuggap/webview.txt').toString();
			if( !stdout ){
				return;
			}
			var process_ids = stdout.trim('\n').split('\n');

			for( var i=0,len=process_ids.length;i<len;i++){
				var port = ports.webview+i;
				(function(port){
					exec('"./main/components/debuggap/modules/adb/adb_'+platforms.adb+'/adb" forward tcp:'+port+' localabstract:webview_devtools_remote_'+process_ids[i],function(error, stdout, stderr){
						if( !error ){
							//if forward successfully,init webview.
							self.init(port);
						}
					});
				})(port);
			}
		},500);

		//forward chrome devtools
		exec('"./main/components/debuggap/modules/adb/adb_'+platforms.adb+'/adb" forward tcp:'+ports.chrome+' localabstract:chrome_devtools_remote',function(error, stdout, stderr){
			if( !error ){
				self.init(ports.chrome);
			}else if( /not found/.test(stderr) ){
             	debuggerTool.setDebugInfo('detectError');
            }
		});
		//last = exec('"./modules/adb/adb" devices');
	},

	getPid:function(){
		var exec = require('child_process').exec;
		var self = this;
		last = exec('netstat -ano | find "5037"');
		
		last.stdout.on('data', function (data) {
			var pid = data.trim().split('\n')[0].match(/LISTENING\s+([0-9]+)/)[1];
			self.killADB(pid);
		});
	},

	killADB:function(pid){
		var exec = require('child_process').exec;
		var self = this;
		//last = exec('"./modules/killadb/kill" '+parseInt(pid));
		var cmd = '"./modules/killadb/kill" '+parseInt(pid);
		last = exec(cmd);
		last.on('exit',function(){
			self.startADB();
		});

		last.stderr.on('data', function (data) {
			alert(data);
		});

		
		last.stdout.on('data', function (data) {
			console.log(data);
		});
	},

	daemon:function(){
		var self = this;
		arguments.callee.count || ( arguments.callee.count = 0 )
		if( arguments.callee.count ++ == 0 ){
			self.daemonIndex = setTimeout(function(){
				if( !self.socket ){
					self.getPid();
				}
			},5000);
		}
	},

	initSocket:function( debugUrl,url ){
		new DGDebuggerClass(debugUrl,url);
	}
};

//start the remote debug 
remoteSocket.start();