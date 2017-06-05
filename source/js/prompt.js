function Prompt(obj){
	//prompt callback registration
	this._promptCallback={};
	//prompt buffer
	this._bufferResult=[];
	var _bufferString = '';

	//box prefix
	this.boxprefix = 'prompt_temp';
	this.listprefix = 'prompt_list';

	this.id = new Date().getTime();
	Prompt.instance[this.id] = this;

	obj && ( this.events = obj);

	var self = this;

	function getPromptFromBuffer(value){
		try{
			var reg = new RegExp('^'+value);
		}catch(e){
			return;	
		}
		var rt = [],bufferResult = self._bufferResult;
		for( var i=0,len=bufferResult.length;i<len;i++){
			if( reg.test(bufferResult[i]) ){
				rt.push(bufferResult[i]);
			}	
		}
		return rt;
	}

	this.getPrompt = function(value,callback){
		if( !$.isEmptyObject( this._promptCallback ) ){
			//reset previous request,only send current request.
			this._promptCallback = {};
		}
		var arr = value.split('.');
		var rt = [];
		if( _bufferString && this._bufferResult.length && ( value == _bufferString || value.substr(-1,1) != '.' ) && value.substr(0,_bufferString.length) == _bufferString ){
			rt = getPromptFromBuffer(arr[arr.length-1]);
			callback(rt);
			return;
		}
		//record the input string
		_bufferString = value;
		//reset cache result
		this._bufferResult = [];
		var timestamp = new Date().getTime();
		this._promptCallback[timestamp] = callback;
		send('getPrompt:'+this.id+"_"+timestamp+':'+value);
	}
}

Prompt.prototype = {

	_callbacks:{
		keydown:function(e){
			var self = e.data.self;
			if( e.keyCode == 38 ){
				self.upPromptItem(function(){
					self.events && self.events.up && self.events.up.call(self,e);
				});
				e.preventDefault();
			}else if( e.keyCode == 40 ){
				self.downPromptItem(function(){
					self.events && self.events.down && self.events.down.call(self,e);
				});
				e.preventDefault();
			}else if( e.keyCode == 39 ){
				self.insertPromptItem(function(){
					self.events && self.events.right && self.events.right.call(self,e);
				});
				e.preventDefault();
			}
		},
		click:function(e){
			var self = e.data.self;
			self._setActive($(this).index());
			self._addPrompt();
			self.insertPromptItem(function(){
				self.events && self.events.clickItem && self.events.clickItem.call(self,e);
			});
		},

		pressEnter:function(e){
			var self = e.data.self;
			if( e.keyCode == 13 ){
				self.insertPromptItem(function(){
					self.events && self.events.pressEnter && self.events.pressEnter.call(self,e);
				});
				e.preventDefault();
			}
		}
	},

	isRegistered:false,
	registerEvent:function(){

		//bind the direction event
		$(this.elem).bind('keydown',{self:this},this._callbacks.keydown);

		$(this.elem).bind('keypress',{self:this},this._callbacks.pressEnter);

		$('#'+this.listId).on('click','li',{self:this},this._callbacks.click);

		//when blur the specific element,destory the box
		var self = this;
		focus_blur.register(this.events.layer,function(){
			self.clean();
		});

		this.isRegistered = true;

	},

	cleanEvent:function(){
		$(this.elem).unbind('keydown',this._callbacks.keydown);
		$(this.elem).unbind('keypress',this._callbacks.pressEnter);
		$('#'+this.listId).off('click','li',this._callbacks.click);

		//unregister focus_blur event
		focus_blur.unregister(this.events.layer);
	},

	setCurrentElement:function(elem){
		this.elem = elem;
	},

	/*
	* elem: the focused element
	* arr: the result list
	*/
	showBox:function(elem,arr){
		//if value of elem equals to the first value of arr.then return it
		if( arr.length == 1 ){
			if( $(elem).text().slice(arr[0].length*-1) == arr[0] ){
				return;
			}
		}
		//if doesn't exist, create it.
		if( !this.boxId || !$('#'+this.boxId).length ){
			this.boxId = this.boxprefix + new Date().getTime();
			$(document.body).append('<div id="'+this.boxId+'"><span></span></div>');

			this.setCurrentElement(elem);
		}
		var style = this._cloneStyle(elem);
		var offset = this._offset(elem);
		var cssText = style+";position:absolute;left:"+offset.left+"px;top:"+offset.top+"px;z-index:-1000;visibility:hidden;";
		document.getElementById(this.boxId).style.cssText = cssText;

		//set content of span
		var value = $(elem).text();
		if( !value ){
			value = $(elem).val();
		}
		var index = value.lastIndexOf('.');
		var con = '|';
		if( index != -1 ){
			con = value.slice(0,index) + con;
		}
		$('#'+this.boxId+' span').text(con);

		//get the position of span
		offset = this._offset($('#'+this.boxId+' span')[0]);
		
		//show the box
		this._showList(arr,offset);

	},

	_showList : function(arr,offset){
		//if doesn't exist, create it.
		if( !this.listId || !$('#'+this.listId).length ){
			this.listId = this.listprefix + new Date().getTime();
			$(document.body).append('<div id="'+this.listId+'" class="'+this.listprefix+' prompt_box"><ul></ul></div>');

			//register event
			this.registerEvent();
		}
		
		var con = '<li class="active">'+ arr.join('</li><li>') +'</li>';
		$('#'+this.listId+' ul').html(con);

		var documentHeight = document.documentElement.clientHeight;
		var boxHeight = $('#'+this.listId).height();
		// 3 pixes for '|' charactor
		var left = offset.left+offset.width-3;
		var top = offset.top+offset.height;
		if( top+ boxHeight > documentHeight ){
			//if top property is so big,minus boxheight.float box above
			top -= (boxHeight+offset.height);
		}
		$('#'+this.listId).css({left:left,top:top});

		//add prompt content 
		this._addPrompt();
	},

    //clone style
    _cloneStyle : function (elem) {

        var className, name, rstyle = /^(number|string)$/;
        var rname = /^(content|outline|outlineWidth)$/; //Opera: content; IE8:outline && outlineWidth
        var cssText = [], sStyle = elem.style;

        for (name in sStyle) {
            if (!rname.test(name)) {
                val = $(elem).css(name);
                if (val !== '' && rstyle.test(typeof val)) { // Firefox 4
                    name = name.replace(/([A-Z])/g, "-$1").toLowerCase();
                    cssText.push(name);
                    cssText.push(':');
                    cssText.push(val);
                    cssText.push(';');
                };
            };
        };
        cssText = cssText.join('');
        return cssText;
    },

	// calculate the offset
	_offset : function (elem) {
        var box = elem.getBoundingClientRect(), doc = elem.ownerDocument, body = doc.body, docElem = doc.documentElement;
        var clientTop = docElem.clientTop || body.clientTop || 0, clientLeft = docElem.clientLeft || body.clientLeft || 0;
        var top = box.top + (self.pageYOffset || docElem.scrollTop) - clientTop, left = box.left + (self.pageXOffset || docElem.scrollLeft) - clientLeft;
        return {
            left: left,
            top: top,
            width: box.width,
            height:box.height
        };
    },

    _setActive:function(index){
    	var lists = $('#'+this.listId+ ' li');
    	lists.removeClass('active');
		lists.eq(index).addClass('active');
    },

    _getActiveValue:function(){
    	return $('#'+this.listId+' li.active').text();
    },

    //choose the next item
    downPromptItem : function(callback){
    	var index = $('#'+this.listId+ ' li.active').index();
    	index ++;
    	var lists = $('#'+this.listId+ ' li');
    	var len = lists.length;
		if( index >= len ){
			index = 0;
		}

		this._setActive(index);

		//calculate height of container
		var elem = lists.eq(index)[0];
		this.calculateHeight(elem);

		//add prompt content 
		this._addPrompt();

		callback.call(this);
    },

    upPromptItem : function(callback){
    	var index = $('#'+this.listId+ ' li.active').index();
    	index --;
    	var lists = $('#'+this.listId+ ' li');
    	var len = lists.length;
		if( index < 0 ){
			index = len-1;
		}

		this._setActive(index);

		//calculate height of container
		var elem = lists.eq(index)[0];
		this.calculateHeight(elem);

		//add prompt content 
		this._addPrompt();

		callback.call(this);
    },

    insertPromptItem:function(callback){

		var promptText = $(this.elem).find('span').text();
		//if promptText is empty and entered valued is empty,this case is for css property
		if( !promptText && !$(this.elem).text() ){
			promptText = this._getActiveValue();
		}
		$(this.elem).find('span').remove();
		$(this.elem).append(promptText);

		this.setCursor();

		//clean it
		this.clean();

		callback.call(this);
    },

    setCursor:function(){
		var lastChild = $(this.elem)[0].lastChild;
		if( !lastChild ) return;
		var range = document.createRange();
		range.setStartAfter(lastChild);
		range.setEndAfter(lastChild);
		window.getSelection().removeAllRanges();
		window.getSelection().addRange(range);
    },

    _addPrompt:function(){

		var t = $(this.elem).clone();
		t.find('span').remove();
		var source = t.text();
		if( !source ){
			return;
		}

		var currentActive = $('#'+this.listId+' li.active').text();

		var index = source.lastIndexOf('.');
		index = index != -1 ? index+1 : 0;
		var spanValue = currentActive.slice(source.slice(index).length);

		$(this.elem).find('span').remove();
		if( spanValue ){
			var value = '<span>'+spanValue+'</span>';
			$(this.elem).append(value);
		}
    },

    calculateHeight : function(elem){
		var totalHeight = elem.parentNode.clientHeight;
		var currentTop = elem.offsetTop;
		var boxHeight = elem.parentNode.parentNode.clientHeight;
		var scrollTop = 0;
		if( currentTop >= boxHeight ){
			scrollTop = Math.floor(currentTop/boxHeight)*boxHeight;
		}else{
			scrollTop = 0;
		}
		elem.parentNode.parentNode.scrollTop = scrollTop;
    },

    //clean the box list and other stuff
    clean : function(){

		if( !this.isRegistered ){
			return;
		}
		this.isRegistered = false;
    	//unbind event
    	this.cleanEvent();

    	//finish the undone job
    	if( $(this.elem).find('span').length ){
    		$(this.elem).text( $(this.elem).text());
    		this.setCursor();
    	}

    	//clean the box list
    	$('#'+this.listId).remove();

    	//clean the template
    	$('#'+this.boxId).remove();
    },

    isShowing : function(){
    	if( this.listId && $('#'+this.listId).length ){
    		return true;
    	}else{
    		return false;
    	}
    }
}

//store instance for Prompt
Prompt.instance = {};

//socket callback
job.doPrompt = function(str){
	var info = str.substr(0,str.indexOf(':')).split("_");
	var id = info[0],timestamp = info[1];
	var instance = Prompt.instance[id];
	var callbacks = instance._promptCallback;

	if( callbacks[timestamp] ){
		var value = str.substr(str.indexOf(':')+1);
		value = JSON.parse(value);
		value.sort();
		//callback
		callbacks[timestamp](value);
		callbacks[timestamp] = null;
		delete callbacks[timestamp];
		//cache the result
		instance._bufferResult = value;
	}
}