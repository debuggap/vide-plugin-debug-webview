function initElement(){
	_element = {};
	_element.preClicked = null;
	_element.element_instance = new ElementClass();

	_element.cssControl = new CssControl();
	var cssPrompt = new CssPrompt({
		layer:'.prompt_box'
	});

	/*
	*add the click event for specific element
	*when it's clicked, change the background
	*/
	$(document).delegate( "div.ov-tl",'click',function(){
		if( !$(this).closest('#elements').length || !$(this).children('.ov-dom').length ){
			//if this is triggered not in the element page, return
			return;
		}
		_element.preClicked && $(_element.preClicked).removeClass('active');
		_element.preClicked = this;
		$(this).addClass('active');

		//get css properties
		var relation = _element.element_instance.get_relation(this.parentNode);
		relation = relation.relation;
		_element.cssControl.setRelation(relation.join(','));
		_element.cssControl.getCssProperties();
	});

	//add the css property
	$('#elements .ele-css').delegate('.css-block','click',function(event){

		if( $(event.target).hasClass('css-key') || $(event.target).hasClass('css-value') ){
			_element.cssControl.editCssItem(event.target);
			addFocusBlur();
			//stop focus_blur event happen immediately
			event.stopPropagation();
			return;
		}
		//for now, we just support the style modification
		if( !$(this).find('.add-new').length ){
			_element.cssControl.addCssPropertyItem($(this).find('ul'));
			addFocusBlur();
			//stop focus_blur event happen immediately
			event.stopPropagation();
		}
	});

	//add the focus blur event
	function addFocusBlur(){
		focus_blur.register('#elements .ele-css .css-edit,.prompt_box',focusBlurFunc);
	}

	function focusBlurFunc(){
		var key = $('#elements .ele-css .css-edit:eq(0)').text().trim();
		var value = $('#elements .ele-css .css-edit:eq(1)').text().trim();

		//cssStyle, 1:style 0:class
		var cssStyle = $('#elements .ele-css .css-edit:eq(0)').closest('.css-block').hasClass('css-style');
		if( !cssStyle ){
			var eleHead = $('#elements .ele-css .css-edit:eq(0)').closest('ul').prev();
			var classIndex = eleHead.attr('sheetIndex')+':'+eleHead.attr('cssRuleIndex');
		}

		//if this is for adding css item
		if( $('#elements .ele-css .css-edit:eq(0)').hasClass('css-add') ){
			if( key && value ){
				if( cssStyle ){
					_element.cssControl.addStyle(key,value);
				}else{
					_element.cssControl.addClassItem(classIndex,key,value);
				}
			}else{
				$('#elements .add-new').remove();
			}
		}else{
			//this is for editing css item
			var index = $('#elements .ele-css .css-edit:eq(0)').parent().index();
			if( key && value ){
				if( cssStyle ){
					_element.cssControl.replaceStyle(key,value,index);
				}else{
					_element.cssControl.replaceClassItem(classIndex,index,key,value);
				}
			}else{
				_element.cssControl.removeStyle(index);
			}
		}
		focus_blur.unregister('#elements .ele-css .css-edit,.prompt_box');
		//clean prompt box
		cssPrompt.clean();
		//remove edit mode
		$('#elements .ele-css .css-edit').removeClass('css-edit');
	}

	$('#elements .ele-css').delegate('.css-edit','keypress',function(event){
		if( event.keyCode == 13 ){
			var key = $('#elements .ele-css .css-edit:eq(0)').text().trim();
			var value = $('#elements .ele-css .css-edit:eq(1)').text().trim();
			if( $(this).hasClass('css-key') && key ){
				$('#elements .ele-css .css-edit:eq(1)')[0].focus();
				_element.cssControl.select($('#elements .ele-css .css-edit:eq(1)'));
			}else if(key && value){
				focusBlurFunc();
			}
			event.preventDefault();
			event.stopPropagation();
		}
	});

	//remove the css property
	$('#elements .ele-css').delegate('.css-del','click',function(event){
			if( $(this).closest('.css-block').hasClass('css-style') ){
				_element.cssControl.removeStyle($(this).parent().index());
			}else{
				var eleHead = $(this).closest('ul').prev();
				var classIndex = eleHead.attr('sheetIndex')+':'+eleHead.attr('cssRuleIndex');
				_element.cssControl.removeClassItem(classIndex,$(this).parent().index());
			}
			event.preventDefault();
			event.stopPropagation();
	});

	//add css key prompt
	$('#elements .ele-css').on('keyup','.css-key',function(e){
		if( e.keyCode >=37 && e.keyCode <=40 ){
			return;
		}
		$(this).find('span').remove();
		var value = $(this).text();
		if( !value ){
			//clean the prompt
			cssPrompt.clean();
			return;
		}

		var elem = this;
		cssPrompt.getPrompt(value,function(arr){
			if( value && arr && arr.length ){
				//show prompt box
				cssPrompt.showBox(elem,arr);
			}else{
				cssPrompt.clean();
			}
		});
	});

	//add css value prompt
	$('#elements .ele-css').on('focus keyup','.css-edit.css-value',function(e){
		if( e.keyCode && e.keyCode >=37 && e.keyCode <=40 || e.keyCode == 13 ){
			return;
		}
		$(this).find('span').remove();
		var value = $(this).text();

		var elem = this;
		cssPrompt.getPromptValue($('#elements .ele-css .css-edit.css-key').text(),value,function(arr){
			if( arr && arr.length ){
				//show prompt box
				cssPrompt.showBox(elem,arr);
			}else{
				cssPrompt.clean();
			}
		});
	});

	//active or inactive css
	$('#elements .ele-css').on('click','.css-active',function(e){
		var type = 'inactive';
		if( $(this).hasClass('css-inactive') ){
			type = 'active';
		}
		if( $(this).closest('.css-block').hasClass('css-style') ){
			//active or inactive for css style
			_element.cssControl.activeStyle($(this).parent().index(),type);
		}else{
			//for class
			var eleHead = $(this).closest('ul').prev();
			var classIndex = eleHead.attr('sheetIndex')+':'+eleHead.attr('cssRuleIndex');
			_element.cssControl.activeClassItem(classIndex,$(this).parent().index(),type);
		}
		e.stopPropagation();
	});
}

/*
* element class
* inherit from ObjectView class
* this is for element inspect
*/
function ElementClass(){
	this.draw_all_structure = function(data){
		var relation = [],len;
		var node = $('#elements .ov-root');
		node.html('');
		do{
			len = relation.length;
			this.draw_elem_children(node[0],data,(len+1)*10);
			$.each(data,function(index,item){
				if( item.c && item.c.length ){
					relation.push(index);
					node = node.find("ul:eq(0)").children().eq(index);
					node.find('.ov-rt').addClass('ov-dn');
					data = item.c;
					return true;
				}
			});
		}while(len != relation.length);

		return node;
	};

	this.synchronizeStyle=function(cssText){
		if( !cssText ){
			this.updateAttr('style','');
		}else{
			this.addAttr('style',cssText);
		}
		this.resetElementBlock();
	}

	this.addAttr = function(key,value,node){
		if( !node ){
			node = $('.ov-tl.active .ov-ele');
		}else{
			node = $(node);
		}

		var attributes = this.getAttrs(node);
		if( attributes[key] ){
			this.updateAttr(key,value,node);
		}else{
			this._addAttr(key,value,node);
		}

	}

	this.removeAttr = function(key,node){
		if( !node ){
			node = $('.ov-tl.active .ov-ele');
		}else{
			node = $(node);
		}
		var html = node.html();
		var reg = new RegExp(' <span class="ov-key">'+key+'</span>="<span class="ov-value">[^<]*</span>"');
		html = html.replace(reg,'');
		node.html(html);
	}

	this._addAttr = function(key,value,node){
		var html = node.html();
		var reg = new RegExp('/*&gt;');
		html = html.replace(reg,' <span class="ov-key">'+key+'</span>="<span class="ov-value">'+value+'</span>"'+"$&");
		node.html(html);
	}

	this.updateAttr = function(key,value,node){
		if( !node ){
			node = $('.ov-tl.active .ov-ele');
		}else{
			node = $(node);
		}
		var html = node.html();
		var reg = new RegExp('<span class="ov-key">'+key+'</span>="<span class="ov-value">[^<]*</span>');
		html = html.replace(reg,'<span class="ov-key">'+key+'</span>="<span class="ov-value">'+value+'</span>');
		node.html(html);
	}

	this.getAttrs = function(node){
		var items = $(node).children('.ov-key');
		var arr={};
		items.each(function(index,ele){
			arr[ $(ele).text() ]=1;
		});
		return arr;
	}

	this.resetElementBlock = function(){
		var node = $('#elements .ele-block')[0];
		$(node).children('ul').removeAttr('style');
		if( node.scrollWidth > node.clientWidth ){
			$(node).children('ul').css('width',node.scrollWidth);
		}
	}
}
if( !ObjectView.instance ){
	new ObjectView();
}
ElementClass.prototype = ObjectView.instance;

/*
* css control for element
*/

function CssControl(){
	//this variable stores current comming css
	this.currentCss = {};
	//this obj is ready for active or inactive css
	this.toggleCss ={};
}
CssControl.prototype = {

	setRelation:function(relation){
		this.relation = relation;
	},

	//add css property item
	addCssPropertyItem:function(ul){
		$('#elements .ele-css .css-add').parent().remove();
		$('#elements .ele-css .css-edit').removeClass('css-edit');

		$(ul).append('<li class="add-new"><span class="css-key css-add css-edit"></span> : <span class="css-value css-add css-edit"></span> </li>');
		$(ul).find('.css-add')[0].focus();
	},

	//add css style for specific element
	addStyle:function(key,value){
		value = key+":"+value;
		send('addCssForElement:'+this.relation+';'+value);
	},

	removeStyle:function(value){
		send('removeCssForElement:'+this.relation+';'+value);
	},

	replaceStyle:function(key,value,index){
		value = key+":"+value;
		send('replaceCssForElement:'+this.relation+';'+index+';'+value);
	},

	activeStyle:function(index,type){
		send('activeCssForElement:'+this.relation+';'+index+';'+type);
	},

	addClassItem:function(classIndex,key,value){

		var cssText = this._findStyleSheet(classIndex);
		var match = cssText.match(/{([^}]*)}/);
		if( !match ){
			return;
		}
		value = key+":"+value;
		if( this._cleanCss(match[1]) ){
			value= this._cleanCss(match[1])+';'+value;
			cssText = cssText.replace(match[1],value);
		}else{
			cssText = cssText.replace(/{\s*}/,'{'+value+'}');
		}

		//store the modified css
		this.toggleCss[classIndex] = cssText;

		send('replaceClassItem:'+this.relation+';'+classIndex+';'+encodeURIComponent(cssText));

	},

	activeClassItem:function(classIndex,index,type){

		var cssText = this._findStyleSheet(classIndex);
		var match = cssText.match(/{([^}]*)}/);
		if( !match ){
			return;
		}
		var arr = this._cleanCss(match[1]).split(';');
		if( type == 'inactive' ){
			arr[index] = '/*'+arr[index]+'*/';
		}else{
			var reg = new RegExp('/\\*+([^*]+)\\*+/');
			arr[index] = arr[index].replace(reg,'$1');
		}
		cssText = cssText.replace(match[1],arr.join(';'));

		//store the modified css
		this.toggleCss[classIndex] = cssText;

		send('replaceClassItem:'+this.relation+';'+classIndex+';'+encodeURIComponent(cssText));
	},

	removeClassItem:function(classIndex,index){
		var cssText = this._findStyleSheet(classIndex);
		var match = cssText.match(/{([^}]*)}/);
		if( !match ){
			return;
		}
		var arr = this._cleanCss(match[1]).split(';');
		arr.splice(index,1);

		cssText = cssText.replace(match[1],arr.join(';'));

		//store the modified css
		this.toggleCss[classIndex] = cssText;

		send('replaceClassItem:'+this.relation+';'+classIndex+';'+encodeURIComponent(cssText));
	},

	replaceClassItem:function(classIndex,index,key,value){
		value = key+':'+value;
		var cssText = this._findStyleSheet(classIndex);
		var match = cssText.match(/{([^}]*)}/);
		if( !match ){
			return;
		}
		var arr = this._cleanCss(match[1]).split(';');
		arr[index] = value;

		cssText = cssText.replace(match[1],arr.join(';'));

		//store the modified css
		this.toggleCss[classIndex] = cssText;

		send('replaceClassItem:'+this.relation+';'+classIndex+';'+encodeURIComponent(cssText));
	},

	_cleanCss:function(css){
		return css.replace(/^\s*|\s*$/g,'').replace(/^;|;$/g,'').replace(/;+/g,';').replace(/;\s+;/g,';');
	},

	_findStyleSheet:function(classIndex){
		var css = '';
		if( this.currentCss ){
			var _classes = this.currentCss._class;
			for( var i=0,len=_classes.length;i<len;i++){
				if( _classes[i].sheetIndex+':'+_classes[i].cssRuleIndex.join(':') == classIndex ){
					css = _classes[i].css;
					break;
				}
			}
		}
		return css;
	},

	//according to relation to get css properties
	getCssProperties:function(){
		send("getCalculateCss:"+this.relation);
	},

	calculateCss:function(obj){

		//synchronize style to active element
		_element.element_instance.synchronizeStyle(obj._style);
		//show the class and style to right panel
		this._transformProperty(obj);
		this.displayCssProperty(obj);
	},

	_overwrite:function(obj){
		if( Object.keys(this.toggleCss).length ){
			//overwrite class
			var _classes = obj._class;
			for( var i=0,len=_classes.length;i<len;i++){
				//if exist this modified css,then replace it.
				var classIndex = _classes[i].sheetIndex+':'+_classes[i].cssRuleIndex.join(':');
				if( this.toggleCss[classIndex] ){
					obj._class[i].css = this.toggleCss[classIndex];
				}
			}
		}
		this.currentCss = obj;
	},

	_transformProperty:function(obj){
		var match = []
		for( var i=0,item;i<obj._class.length;i++){
			item = obj._class[i];
			match = item.css.match(/^([^{]+){([^}]*)}/);
			if( match ){
				item.cssName = match[1].trim();
				item.cssProperty = this._transformKeyValue(match[2]);
			}
		}
		var reg = new RegExp(';\\s*\\*\\/','g');
		obj._style = obj._style.replace(reg,' */;');
		obj._style = this._transformKeyValue(obj._style);
	},

	_transformKeyValue:function(value){
		value = value.trim();
		var obj= [];
		var arr = value.split(";"),temp;
		for( var i=0;i<arr.length;i++){
			if( arr[i] ){
				var reg = new RegExp('\\/\\*+([^*]+)\\*+\\/');
				var match = arr[i].match(reg);
				var cssObj = {};
				if( match && match[1] ){
					arr[i] = match[1];
					cssObj.comment = 1;
				}
				temp = arr[i].split(":");
				cssObj.name = temp[0].trim();
				cssObj.value = temp[1].trim();
				obj.push(cssObj);
			}
		}
		return obj;
	},

	displayCssProperty:function(obj){
		var stack = {};
		this._changeCssPriority(obj,stack);
		this._emptyCssList();
		this._displayStyleProperty(obj._style,stack);
		this._displayClassProperty(obj._class,stack);
	},

	_emptyCssList:function(){
		$('#elements .ele-css').html('');
	},

	_displayClassProperty:function(_class,stack){
		var cssBlock = '',str='',item,style,overwriteClass,activeClass;
		for( var i=0;i<_class.length;i++){
			item = _class[i];
			var classAttr = 'sheetIndex='+item.sheetIndex+' cssRuleIndex='+item.cssRuleIndex.join(':');
			cssBlock = '<div class="css-block">'+(item.mediaText ? '<div class="css-media-head">'+item.mediaText+'</div>':'')+'<div class="block-head" '+classAttr+'><span class="css-source" title="'+item.href+'">'+getFilenameByUrl(item.href)+'</span><span class="css-name">'+item.cssName+' {</span></div>';
			style = item.cssProperty || [];
			str = '<ul>';
			for( var j=0;j<style.length;j++ ){
				obj = style[j];
				if( obj.overline ){
					overwriteClass = 'class="css-overwrite"';
				}else{
					overwriteClass = '';
				}
				//if this property is commented,inactive
				if( obj.comment ){
					activeClass = 'css-active css-inactive';
					overwriteClass = 'class="css-overwrite"';
				}else{
					activeClass = 'css-active';
				}
				str += '<li '+overwriteClass+'><span class="'+activeClass+'"></span><span class="css-key">'+obj.name+'</span> : <span class="css-value">'+obj.value+'</span><span class="css-del"></span></li>';
			}

			cssBlock += str+'</ul>';

			cssBlock += '<div>}</div>';
			$('#elements .ele-css').append(cssBlock);
		}
	},

	_displayStyleProperty:function(style,stack){

		var cssBlock = '<div class="css-block css-style"><div class="block-head">element.style {</div>',str='<ul>',obj;
		var overwriteClass;
		var activeClass;
		for( var i=0;i<style.length;i++ ){
			obj = style[i];
			//if this property is overwrited,add overwrite mark
			if( obj.overline ){
				overwriteClass = 'class="css-overwrite"';
			}else{
				overwriteClass = '';
			}
			//if this property is commented,inactive
			if( obj.comment ){
				activeClass = 'css-active css-inactive';
				overwriteClass = 'class="css-overwrite"';
			}else{
				activeClass = 'css-active';
			}
			str += '<li '+overwriteClass+'><span class="'+activeClass+'"></span><span class="css-key">'+obj.name+'</span> : <span class="css-value">'+obj.value+'</span> <span class="css-del"></span></li>';
		}

		cssBlock += str+'</ul>';

		cssBlock += '<div>}</div>';
		$('#elements .ele-css').append(cssBlock);
	},

	_changeCssPriority:function(obj,stack){
		var cssArr = [obj._style],subArr;
		var name,value;
		$.each(obj._class,function(a,b){
			b.cssProperty && cssArr.push(b.cssProperty);
		});
		
		for( var i=0;i<cssArr.length;i++){
			subArr = cssArr[i];
			subArr.reverse();
			for( var j = 0;j<subArr.length;j++){
				name = subArr[j].name;
				value = subArr[j].value;
				if( stack[name] == 2 ){
					subArr[j].overline = 1;
				}else if( stack[name] == 1 ){
					if( value.match(/!\s*important/) ){
						stack[name] = 2;
						this._setPreviousLowerPriority(cssArr,i,j,name);
					}else{
						subArr[j].overline = 1;
					}
				}else{
					/*
					* 2 means this is important,no one can overwrite.
					* 1 means this is common property, unless important css, no one can overwrite it;
					* if the css property is commented, its value will be 1 which means it is overline.
					*/
					if( subArr[j].comment ){
						subArr[j].overline = 1;
					}else{
						stack[name] = value.match(/!\s*important/) ? 2 : 1;
						subArr[j].overline = 0;
					}
				}		
			}
			subArr.reverse();
		}
	},

	_setPreviousLowerPriority:function(arr,firstCount,secondCount,name){
		var subArr;
		for( var i=0;i<firstCount;i++){
			subArr = arr[i];
			for( var j = 0;j<subArr.length;j++){
				if( subArr[j].name == name ){
					subArr[j].overline = 1;
				}
			}
		}
		subArr = arr[firstCount];
		for( var i=0;i<secondCount;i++){
			if( subArr[i].name == name ){
				subArr[i].overline = 1;
			}
		}
	},

	editCssItem:function(obj){
		$('#elements .ele-css .css-add').parent().remove();
		$('#elements .ele-css .css-edit').removeClass('css-edit');

		$(obj).parent().children('.css-key,.css-value').addClass('css-edit');
		$(obj)[0].focus();
		this.select(obj);
	},

	select:function(elem){
		var elem = $(elem)[0];
		var range = document.createRange();
		if( elem.firstChild ){
			range.setStartBefore(elem.firstChild);
			range.setEndAfter(elem.lastChild);
			window.getSelection().addRange(range);
		}
	}
}


$.extend(job,{
	//add the all the structure until looping to leaves
	doAllStructure:function(data,returnValue){
		
		data = JSON.parse(data);
		data = _element.element_instance.draw_all_structure(data);
		if( !returnValue ){
			//default active body element
			var items = $('.ov-tl');
			for( var i=0,len=items.length;i<len;i++){
				if( /body/.test(items.eq(i).text()) ){
					items.eq(i).trigger('click');
					return;
				} 
			}
		}else{
			return data;
		}
	},
	doLeafStructure:function(data){
		var index = data.indexOf(';');
		var lastPos = parseInt(data.substr(0,index));
		data = data.substr(index+1);
		var filter = this.doAllStructure(data,true);
		filter = filter.find('ul:eq(0)').children().eq(lastPos);
		filter.children().filter('.ov-tl').trigger('click');
		//show the element page
		$('.head li[targetid="elements"]').trigger('click');
	},

	doCalculateCss:function(obj){
		obj = JSON.parse(obj);

		if( !this.calculateCss ){
			this.calculateCss = new CalculateCss();
		}
		//overwrite class property before sorting the class
		_element.cssControl._overwrite(obj);

		this.calculateCss.sort(obj._class);
		_element.cssControl.calculateCss(obj);
	}

});