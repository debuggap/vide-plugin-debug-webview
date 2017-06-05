function initConsole(){
	
	_console = {};
	_console.history = [];
	var prompt = new Prompt({
		'layer':'.prompt_box,.console-log'
	});
	prompt.elem = $('#console .console-input')[0];

	if( localStorage._consoleHistory ){
		_console.history = JSON.parse( localStorage._consoleHistory ).slice(0,20);
	}
	_console.curIndex = -1;

	//bind event for right,down and up button
	$('#console .console-input').bind('keydown',function(e){

		var needSetPosition = 0;
		if( e.keyCode == 38 ){
			if( !prompt.isShowing() ){
				consoleTool.upHistory();
			}
			e.preventDefault();
		}else if( e.keyCode == 40 ){
			if( !prompt.isShowing() ){
				consoleTool.downHistory();
			}
			e.preventDefault();
		}

	});

	//bind event for enter-press
	$('#console .console-input').bind('keypress',function(e){
		if( e.keyCode == 13 && !e.shiftKey && !prompt.isShowing() ){
			var cmd = $(prompt.elem).text().replace(/<br>/g,"");
			if( cmd ){
				//send the command
				job._sendCommand(cmd);

				//clean the prompt
				prompt.clean();
			}
			e.preventDefault();
		}
	});
	
	//bind for prompt
	$('#console .console-input').bind('keyup',function(e){

		if( e.keyCode >=37 && e.keyCode <=40 || e.keyCode == 13 ){
			return;
		}
		$(this).find('span').remove();
		var value = $(this).text();
		if( !value ){
			//clean the prompt
			prompt.clean();
			return;
		}
		var self = this;
		prompt.getPrompt(value,function(arr){
			//if the result is not empty,then display prompt
			if( value && arr && arr.length ){
				//show prompt box
				prompt.showBox(self,arr);
			}else{
				prompt.clean();
			}
		});
	});

	//add event on the filter span
    $('#console .filter .f-item').on('click',function(){
        $('#console .filter .f-item').removeClass('f-active');
        $(this).addClass('f-active');
        //filter the console
        job._filterConsoleByType($(this).text());

		//clean the filter content
		$('#console .filter .f-input').val('');
    });

    //add event for filter input
    $('#console .filter .f-input').on('keyup',function(){
        job._filterConsoleByCon($(this).val());
    });

    //clean the console
    $('#console .filter .f-clear').on('click',function(){
        job._clearConsole();
    });

    var consoleTool = {

    	upHistory:function(){
			_console.curIndex ++;
			var elem = $('#console .console-input')[0];
			if( _console.curIndex < _console.history.length ){
				$(elem).html( _console.history[ _console.curIndex ] );
				prompt.setCursor();
			}else{
				_console.curIndex --;
			}
    	},

    	downHistory:function(){
			_console.curIndex --;
			var elem = $('#console .console-input')[0];
			if( _console.curIndex < 0 ){
				$(elem).html('');
				_console.curIndex = -1;
			}else{
				$(elem).html( _console.history[ _console.curIndex ] );
				prompt.setCursor();
			}
    	}
    }
}

$.extend(job,{
	//send the command to client
	_sendCommand:function(cmd){
		if( _console.history[0] != cmd ){
			_console.history.unshift(cmd);
			localStorage._consoleHistory = JSON.stringify( _console.history );
		}
		_console.curIndex = -1;
		send("cmd:"+cmd);
		//clean the input
		$('#console .console-input').html("");
		this._addCmd(cmd);
	},

	_addCmd:function(con){
		var inputTr = $('.console-log table tr').last();
		var newTr = inputTr.clone(true);
		newTr.insertBefore(inputTr);

		con = htmlspecialchars(con);

		con = '<span class="span-cmd">'+con+'</span>';
		var type = '<span class="span-cmd-icon">></span>';
		newTr.children().last().html(con);
		newTr.children().last().addClass('td-hr');
		newTr.children().first().html(type);
		$('.console-log')[0].scrollTop=100000;

	},

	//add a row
	_addTr:function(con,type){
		var inputTr = $('.console-log table tr').last();
		var newTr = inputTr.clone(true);
		newTr.insertBefore(inputTr);

		if( type == "cmd" || type == "log" ){
			type = '<span class="span-cmd-icon"><</span>';
		}else if( type == "error" ){
			type = '<span class="span-error-icon"></span>';
		}else if( type == "warn" ){
			type = '<span class="span-warning-icon"></span>';
		}
		newTr.children().last().html(con);
		newTr.children().last().addClass('td-hr');
		newTr.children().first().html(type);
		$('.console-log')[0].scrollTop=100000;

	},
	//object view for return content
	_addObjectView:function(con){
		var inputTr = $('.console-log table tr').last();
		var newTr = inputTr.clone(true);
		newTr.insertBefore(inputTr);

		con = get_object_view(con);

		newTr.children().last().html(con);
		newTr.children().last().addClass('td-hr');
		newTr.children().first().html('');
		$('.console-log')[0].scrollTop=100000;

	},
	doErrorCmd:function(con){
		var con,type;
		try{
			con = JSON.parse(con);
			if( typeof con =='object' ){
				con = get_object_view(con);
			}else{
				throw 'error';
			}
		}catch(e){
			//if debugger is active, return;
			if( DGDebugger && DGDebugger.flag.console ){
				return;
			}
			con = htmlspecialchars(con);
			con = '<span class="span-error">'+con+'</span>';
		}
		this._addTr(con, 'error');
	},
	doLogCmd:function(con){
		var con,type;
		try{
			con = JSON.parse(con);
			if( typeof con =='object' ){
				con = get_object_view(con);
			}else{
				throw 'error';
			}
		}catch(e){
			//if debugger is active, return;
			if( DGDebugger && DGDebugger.flag.console ){
				return;
			}
			con = htmlspecialchars(con);
			con = '<pre><span class="span-log">'+con+'</span></pre>';
		}
		this._addTr(con,'log');
	},
	doWarnCmd:function(con){
		var con,type;
		try{
			con = JSON.parse(con);
			if( typeof con =='object' ){
				con = get_object_view(con);
			}else{
				throw 'error';
			}
		}catch(e){
			//if debugger is active, return;
			if( DGDebugger && DGDebugger.flag.console ){
				return;
			}
			con = htmlspecialchars(con);
			con = '<span class="span-warning">'+con+'</span>';
		}
		this._addTr(con, 'warn');
	},

	doCmdResult:function(con){
		try{
			con = JSON.parse(con);
			if( typeof con == 'object' ){
				con = get_object_view(con);
				this._addTr(con,'cmd');
				return;
			}
		}catch(e){}
		con = htmlspecialchars(con);
		con = '<pre><span class="span-log">'+con+'</span></pre>';
		this._addTr(con,'log');
    },
	
	_filterType:'All',
	_filterConsoleByType:function(value){
		this._filterType = value;
		if( value == "All" ){
			$('#console .console-log table tr').show();
			return;
		}else if( value ){
			value = "span-"+value.toLowerCase();
		}
		$('#console .console-log table .td-hr').each(function(a,b){
			if( $(b).find('span:first').hasClass(value) ){
				$(b).parent().show();
			}else{
				$(b).parent().hide();
			}
		});
	},

	_filterConsoleByCon:function(value){
		if( value ){
			value = new RegExp(value,'i');
		}
		//firstly display the specific item
		this._filterConsoleByType(this._filterType);

		$('#console .console-log table .td-hr').each(function(a,b){
			if( $(b).parent().css('display') == 'none' ){
				return;
			}
			if( value ){
				if( value.test($(b).text()) ){
					$(b).parent().show();
				}else{
					$(b).parent().hide();
				}
			}else{
				$(b).parent().show();
			}
		});
	},

	_clearConsole:function(){
		var len = $('#console .console-log table tr').length;
		$('#console .console-log table tr:lt('+(len-1)+')').remove();
	},

	//refresh the console page when the window size has changed
	_refreshConsoleForPre:function(){
		return;
		var width = $('.console .console-log').width() - 30;
		var text = '.console pre {width:'+width+'px ! important}';
		if( $('.console style').length ){
			$('.console style').text( text );
		}else{
			$('.console').prepend('<style>'+text+'</style>');
		}
	}
});