function initSource(){
	//global variable
	_source = {};
	_source.file = {};
	
	//show the tree
	$('#sources .show-tree').on('click',function(e){
		$('#sources .dock-tree').css({left:'0px'});
		//check if the tree has been loaded
		if( !$('#sTree').text() ){
			$('#sources .dock-tree').showSpinner({left:0});
			toDistribute('fileTree');
		}
	});
	
	//hide the tree
	$('#sources .hide-tree').on('click',function(e){
		$('#sources .dock-tree').css({left:'-300px'});
	});
	
	//close the tab
	$('#sources .s-ul').delegate( "span",'click',function(e){
		var currentLi = $( this ).parent();
		var prev= currentLi.prev();
		//remove current node
		var targetId = currentLi.remove().attr( "target" );
		$( "#" + targetId ).remove();
		//if there exists previous node,show it
		if( prev.length ){
			prev.addClass('li-active');
			$("#"+prev.attr("target")).show();
		}
		return false;
	});
	
	//toggle the file when click
	$('#sources .s-ul').delegate("li","click",function(e){
		$('#sTabs ul').children().removeClass('li-active');
		$('#sTabs').children().filter('div.file-con').hide();
		$(this).addClass('li-active');
		var targetId = $(this).attr("target");
		$('#'+targetId).show();
	});
	
	//when click the edit,Save,Cancel button,trigger the following function
	$('#sTabs').delegate('span.file-modify','click',function(){
		var text = $(this).text().toLowerCase();
		var id = $(this).parent().parent().attr('id');
		var filePath = $('#sTabs li[target="'+id+'"]').attr('_src');
		if( text == "edit" ){
			$(this).hide().siblings().show();
			$(this).parent().next().css('-webkit-user-modify','read-write-plainText-only');
		}else if( text == "cancel" ){
			$(this).hide().prev().hide().prev().show();
			$(this).parent().next().css('-webkit-user-modify','');
			//recover the content
			job._addFileCon(id,_source.file[id]);
		}else{
			$(this).hide().next().hide().prev().prev().show();
			$(this).parent().next().css('-webkit-user-modify','');
			var con = $(this).parent().next().text();
			job._cacheFile(filePath,con);
			//cache the file content
			con = job._handleJsCode(con);
			$(this).parent().next().html(con);
			_source.file[id] = con;
		}
	});
}

$.extend(job,{
	//get the tree structure
	doFileTree:function(data){
		data = JSON.parse(data);
		data[1] = data[1] ? data[1] : '(index)';
		data[2].push(data[1]);
		this._sPre = data[0];
		this._sTitle = data[1];
		this._sFiles = data[2];
		var node = [{}];
		node[0][this._sTitle] = this._sFiles;
		node = this._getSourceTree(node);
		var tree = {
			showcheck: true,
			data : node,
			onnodeclick:function(item){
				if( !item.hasChildren ){
					job._showFilebyTree(item);
				}
			} 
		}
		//show the tree
		$("#sTree").treeview(tree);
		//hide the spinner
		$('#sources .dock-tree').hideSpinner();
	},
	_getSourceTree:function(obj){
		var rt =[];
		for( var i=0;i<obj.length;i++){
			if( typeof obj[i] == 'string' ){
				rt.push({
					 id : obj[i],
					 text : obj[i],
					 complete : true,
					 isexpand : false,
					 hasChildren : false
				});
			}else{
				var name = Object.keys(obj[i])[0];
				var subArray = obj[i][name];
				while( subArray.length == 1 && typeof subArray[0] != 'string' && name != job._sTitle ){
					var n = Object.keys(subArray[0])[0];
					name += ("/"+n);
					subArray = subArray[0][n];
				}
				rt.unshift({
					  id : name,
					  text : name,
					  complete : true,
					  isexpand : job._sTitle == name ? true :false,   
					  hasChildren : true,
					  ChildNodes : job._getSourceTree(subArray)
				});
			}
		}
		return rt;
	},
	//show tree according to tree leaf
	_showFilebyTree:function(item){
		
		//add the spinner
		$('#sources').showSpinner();
		var filePath = [];
		var fileName = item.text;
		var value = '';
		do{
			value = item.text != '(index)' ? item.text : '';
			filePath.unshift(value);
			item = item.parent;
		}while(item && item.parent );
		filePath = job._sPre + filePath.join('/');
		var fileId = filePath.replace(/(\.|\\|\/|:|%20)/g,"_").replace(/\?.+/,'');
		//add the tab
		if( !$('#sTabs ul li[target="'+fileId+'"]').length ){
			tabTemplate = '<li target="'+fileId+'" _src="'+filePath+'"><a href="javascript:void(0)">'+fileName+'</a><span></span></li>';
			$('#sTabs ul').append( tabTemplate );
			
			this._getFileCon(filePath);
		}else{
			//remove the spinner
			$('#sources').hideSpinner();
		}
		//display content
		//fist hide all the componets and then show current
		$('#sTabs ul').children().removeClass('li-active');
		$('#sTabs').children().filter('div.file-con').hide();
		$('#sTabs ul li[target="'+fileId+'"]').addClass('li-active');
		$('#'+fileId).show();
		//hide the tree
		$('#sources .hide-tree').trigger('click');
	},
	//get the file content from client
	_getFileCon:function(filePath){
		var fileId = filePath.replace(/(\.|\\|\/|:|%20)/g,"_").replace(/\?.+/,'');
		if( _source.file[fileId] ){
			this._addFileCon( fileId, _source.file[fileId] );
			return false;
		}
		send("file:"+filePath);
	},
	_addFileCon:function(id,con){
		//remove the spinner
		$('#sources').hideSpinner();
		//add the content
		$('#'+id).remove();
        //add the framework for the content
		$('#sTabs').append( '<div id="'+id+'" class="file-con"><div class="edit-file" style="display:none;"><span class="file-modify" style="display:inline-block;">Edit</span><span class="file-modify">Save</span><span class="file-modify">Cancel</span></div><div class="code-line-num"></div><div class="code-line"></div></div>' );
        con = con.split('\n');
        var len = con.length;
        var codeLineNum="",codeLine="",fragEle = document.createDocumentFragment();
        for( var i= 0,j=1;i<len;i++){
            codeLineNum += '<span _id="codenum'+i+'" class="num">'+j+++'</span>';
            codeLine += '<div _id="codeline'+i+'" class="pre" >'+con[i]+'</div>';
			/*
			var div = document.createElement('div');
			div.id = "codeline"+i;
			div.className = 'pre';
			div.appendChild(document.createTextNode(con[i]));
			fragEle.appendChild(div);
			*/
        }

        $('#'+id).find('.code-line-num').html(codeLineNum);
        $('#'+id).find('.code-line').html(codeLine);
		//$('#'+id).find('.code-line')[0].appendChild(fragEle);
	},
	//receive the content
	doFileCon:function(data){
		var index = data.indexOf("_dg_");
		if( index < 1 ){
			return;
		}
		var filePath= data.substring(0,index);
		var con = data.substring(index+4);
        //con = htmlspecialchars(con);
		//add the color for the special variable for data
		con = this._handleJsCode(con);
		var fileId = filePath.replace(/(\.|\\|\/|:|%20)/g,"_").replace(/\?.+/,'');
		this._addFileCon( fileId, con );
		//cache the file content
		_source.file[fileId] = con;
	},
	_handleJsCode:function(str){
		
		var _c = [];
		var _q = [];
		var _k = [];
		var _n = [];
		var _s = [];

		str = str.replace(/\*\/\*/g,function(a){
			var len = _s.length;
			_s[len] = a;
			return "dg_s"+len+"_dg";
		});

		//replace quote
		str = str.replace(/'.*?'|".*?"/g,function(a){
			var len = _q.length;
			_q[len] = '<span class="s-quote">'+htmlspecialchars(a)+'</span>';
			return "dg_q"+len+"_dg";
			
		});

		//replace comments
		str = str.replace(/\/\*[\s\S]*?\*\//g,function(a){
			var arr = a.split('\n'),len,rt="";
			for( var i=0;i<arr.length;i++){
				len = _c.length;
				_c[len] = '<span class="s-comment">'+arr[i]+'</span>' + (i<arr.length-1 ? '\n' : '');
				rt += "dg_c"+len+"_dg";
			}
			return rt;		
		});

		str = str.replace(/(\/\/[\s\S]*?)\n/g,function(a,b,c){
			var len = _c.length;
			_c[len] = '<span class="s-comment">'+htmlspecialchars(b)+'</span>';
			return "dg_c"+len+"_dg\n";
			
		});

		//replace the keyword

		str = str.replace(/([^a-zA-Z0-9_]|\n)(break|delete|function|return|typeof|case|do|if|switch|var|catch|else|in|this|void|continue|false|instanceof|throw|while|debugger|finally|new|true|with|default|for|null|try)([^a-zA-Z0-9_]|\n)/g,function(a,b,c,d){
			var len = _k.length;
			_k[len] = '<span class="s-keyword">'+c+'</span>';
			return b+"dg_k"+len+"_dg"+d;
			
		});

		//replace the number
		str = str.replace(/([^0-9a-zA-Z_])([0-9]+)([^0-9a-zA-Z_])/g,function(a,b,c,d){
			var len = _n.length;
			_n[len] = '<span class="s-number">'+c+'</span>';
			return b+"dg_n"+len+"_dg"+d;
			
		});
		
		//revert the replacement
		//str =  str.replace(/&/g,'&amp;').replace(/\"/g,"&quot;").replace(/\'/g,"&#039").replace(/</g,'&lt;').replace(/>/g,"&gt;");
		str = htmlspecialchars(str);

		str = str.replace(/dg_c([0-9]*)_dg/g,function(a,b){
			return _c[b];                                   
		})

		str = str.replace(/dg_q([0-9]*)_dg/g,function(a,b){
			return _q[b];
		})

		str = str.replace(/dg_k([0-9]*)_dg/g,function(a,b){
			return _k[b];
		})

		str = str.replace(/dg_n([0-9]*)_dg/g,function(a,b){
			return _n[b];
		})
		
		str = str.replace(/dg_s([0-9]*)_dg/g,function(a,b){
			return _s[b];
		})
		
		return str;
		
	},
	_cacheFile:function(id,con){
		send("cacheFile:"+id+"_dg_"+ con);
	}
});