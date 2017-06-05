/*
*	this function is for object tree,it's more clean to see the structure
*/
function ObjectView(conf){

	//self-closed tag
	this.selfClosing = {img: 1, hr: 1, br: 1, area: 1, base: 1, basefont: 1, input: 1, link: 1, meta: 1,
			command: 1, embed: 1, keygen: 1, wbr: 1, param: 1, source: 1, track: 1, col: 1};

	this.bindCommonEvent = function(){
		ObjectView.instance = this;
		ObjectView.data = {};
		var self = this;
		//listen child node event
		$(document).delegate('span.ov-rt','click',function(e){
			if( $(this).hasClass('ov-dn') ){
				self.remove(this);
			}else{
				self.append(this);
			}
			//stop the click event on div.ov-tl
			e.stopPropagation();
		});
		//add the event for element node which is in Array or Object.
		$(document).delegate('span.ov-element','click',function(){
			var obj = decodeURIComponent($(this).attr('_element'));
			obj = JSON.parse(obj);
			job._addObjectView(obj);
		});

		//inspect the element
		$(document).delegate('.ov-node div.ov-tl','mouseover',function(e){
			if( utility.isMouseover(this,e) ){
				var rt = self.get_relation(this.parentNode);
				var relation = rt.relation;
				if( $(this).closest('.ov-root').attr('_relation') ){
					//this is for element node
					relation = $(this).closest('.ov-root').attr('_relation').split(',').concat(relation);
				}
				if( relation.length ){
					send("relationToEle:"+relation.join(','));
				}
			}
		});

		//clean the inspect effect
		$(document).delegate('.ov-node div.ov-tl','mouseout',function(e){
			if( utility.isMouseout(this,e) ){
				send("cleanInspect:");
			}
		});

	}

	this.draw_init = function(obj,index){
		var value = '',str=[],hasChildren=false;

		var ele_class='';//this class is for different object(text,comment,and so on );
		var dom_class='';//this class is only for element node(body,document,div,input...)
		var relation = ''//this is only for element node,

		if( $.isArray(obj) ){
			if( !obj.length ){
				value = '[ ]';
			}else{
				value = 'Array['+obj.length+']';
				hasChildren = true;
			}
		}else if( obj._dg_t ){
			//this route is for element
			var rt = this.deal_element_content(obj);
			if( obj.c ){
				hasChildren = true;
			}
			value = rt.value;
			ele_class = rt.className;
			if( rt.isDom ){
				//add the node judgement for event handle
				dom_class = 'ov-node';
				relation = '_relation="'+obj.relation.join(',')+'"';
			}
		}else{
			// this is for plain object
			hasChildren = true;
			value = 'Object';
		}

		str.push('<div class="ov" _index="'+index+'">');
		str.push('<ul><li class="ov-root '+ dom_class+'" '+relation+'>');
		str.push('<div class="ov-tl"><span class="ov-sp"></span>');
		if( hasChildren ){
			str.push('<span class="ov-rt"></span>');
		}
		str.push('<div class="ov-ele '+ele_class+'">'+value+'</div></div>');
		str.push('</li></ul></div>');

		return str.join('');
	}

	this.deal_element_content = function(obj){
		var rt={};
		if( obj._dg_t == '#comment' ){
			rt.value = '&lt;!--' + obj.s + '--&gt;';
			rt.className = 'ov-com';
		}else if( obj._dg_t == '#text' ){
			rt.value = '<pre>'+obj.s+'</pre>';
			rt.className = 'ov-text';
		}else if( obj._dg_t == '#document' ){
         	rt.value = obj._dg_t;
         	rt.className = 'ov-doc';
         	rt.isDom = 1;
        }else if( obj._dg_t ){
            var str = [];
            //get the attributes of element
        	if( obj.a ){
        		$.each(obj.a,function(key,value){
					str.push('<span class="ov-key">'+key+'</span>="<span class="ov-value">'+value+'</span>"');
        		});
        		str = ' '+str.join(' ');
        	}else{
        		str = '';
        	}
        	//generate this element
        	if( this.selfClosing[obj._dg_t] ){
        		//if the element is self-closed,such like "input,hr"
        		rt.value = '&lt;'+obj._dg_t+str+ '/&gt;';
        	}else if( obj.cs ){
        		obj.c = false;
                rt.value = '&lt;'+obj._dg_t+str+ '&gt;'+( obj.cs ? '<span class="ov-text">'+htmlspecialchars(obj.cs)+'</span>' : '' )+'&lt;/'+obj._dg_t+'&gt;';
            }else if( !obj.c ){
        		rt.value = '&lt;'+obj._dg_t+str+ '&gt;'+( obj.cs ? '<span class="ov-text">'+htmlspecialchars(obj.cs)+'</span>' : '' )+'&lt;/'+obj._dg_t+'&gt;';
        	}else{
				rt.value = '&lt;'+obj._dg_t+str+ '&gt;';
			}
			rt.className = 'ov-dom';
			rt.isDom = 1;
		}else{
			rt.value = htmlspecialchars(obj.s);
			rt.className = 'ov-doctype';
		}
		return rt;
	}

	this.get_relation = function(obj){
		var li = $(obj);
		var relation = [],key;

		while( !li.hasClass('ov-root') ){
			key = li.attr('_key');
			relation.unshift( key ? key : li.index() );
			li = li.parent().parent();
		}

		return{
			relation:relation,
			index:li.parent().parent().attr('_index')
		}
	}

	this.get_children = function(obj,relation){
		for( var i=0,len=relation.length;i<len;i++){
			obj = obj[relation[i]];
		}
		return obj;
	}

	this.get_remote_children = function(relation,func){
		job._getChildrenList(relation,func);
	}

	this.draw_children = function(target,rt,space_width){
		var str = [],value;
		/*
		 *style1: for node who has children,
		 *style2: for node who has no children.
		 */
		var style1 = 'style="width:'+ space_width +'px"';
		var style2 = 'style="width:'+ (space_width+16) +'px"';
		var value,classes;
		for( var key in rt ){
			value = rt[key];
			switch( Object.prototype.toString.call( value ) ){
				case '[object Array]':
					value = '<li _key='+key+'><div class="ov-tl"><span class="ov-sp" '+ style1+'></span><span class="ov-rt"></span><div class="ov-ele">'+key+': <span class="ov-obj">Array['+value.length+']</span></div></div></li>';break;
				case '[object Object]':

					if( value && value.tag ){
						//this is for 'reg,function' object
						value = '<li><div class="ov-tl"><span class="ov-sp"'+ style2+'></span><div class="ov-ele">'+key+': <span class="ov-'+value.tag+'">'+value.v+'</span></div></div></li>';break;
					}else if( value && value.element ){
						//this is for element
						value = '<li><div class="ov-tl"><span class="ov-sp"'+ style2+'></span><div class="ov-ele">'+key+': <span class="ov-element" _element="'+ encodeURIComponent(JSON.stringify(value.element))+'" title="inspect this element">'+value.v+'</span></div></div></li>';break;
					}else{
						value = '<li _key='+key+'><div class="ov-tl"><span class="ov-sp" '+ style1+'></span><span class="ov-rt"></span><div class="ov-ele">'+key+': <span class="ov-obj">Object</span></div></div></li>';break;
					}
				case '[object String]':
					value = '<li><div class="ov-tl"><span class="ov-sp"'+ style2+'></span><div class="ov-ele">'+key+': "<span class="ov-str">'+value+'</span>"</div></div></li>';break;
				case '[object Null]':
				case '[object Undefined]':
				case '[object Number]':
				case '[object Boolean]':
					if( value == '[object Null]' || value == '[object Undefined]' ){
						classes = 'ov-null';
					}else if( value == '[object Number]' ){
						classes = 'ov-num';
					}else{
						classes = 'ov-bool';
					}
					value = '<li><div class="ov-tl"><span class="ov-sp"'+ style2+'></span><div class="ov-ele">'+key+': <span class="'+ classes +'">'+value+'</span></div></div></li>';break;
				default:break;
			}
			str.push(value);
		}

		if( str.length ){
			str.unshift('<ul>');
			str.push('</ul>');
		}
		$(target).append(str.join(''));
	}

	this.draw_elem_children = function(target,rt,space_width){
		var str = [],value;
		/*
		 *style1: for node who has children,
		 *style2: for node who has no children.
		 */
		var style1 = 'style="width:'+ space_width +'px"';
		var style2 = 'style="width:'+ (space_width+16) +'px"';
		var value;
		for( var key in rt ){
			value = rt[key];
			var result = this.deal_element_content(value);
			if( result && result.isDom && value.c ){
				//if this is a element node and has children.
				value = '<li _key='+key+' class="ov-node"><div class="ov-tl"><span class="ov-sp" '+ style1+'></span><span class="ov-rt"></span><div class="ov-ele '+ result.className +'">'+ result.value+'</div></div></li>';
			}else{
				value = '<li _key='+key+'><div class="ov-tl"><span class="ov-sp" '+ style2 +'></span><div class="ov-ele '+ result.className +'">'+result.value+'</div></div></li>';
			}

			str.push(value);
		}

		if( str.length ){
			str.unshift('<ul>');
			str.push('</ul>');
		}
		$(target).append(str.join(''));
	}

	this.append = function(obj){
		$(obj).addClass('ov-dn');
		obj = obj.parentNode.parentNode;
		var rt = this.get_relation(obj);
		var self = this;
		if( $(obj).hasClass('ov-node') ){
			//if this is element node, we should get the children from the remote client.
			var relation = rt.relation;
			if( $(obj).closest('.ov-root').attr('_relation') ){
				//this is for element node
				relation = $(obj).closest('.ov-root').attr('_relation').split(',').concat(relation);
			}
			this.get_remote_children(relation,function(relation,data){
				self.draw_elem_children(obj,data,(1+rt.relation.length)*10);
			});
		}else{
			var children = this.get_children(ObjectView.data[rt.index],rt.relation);
			this.draw_children(obj,children,(1+rt.relation.length)*10);
		}
	}

	this.remove = function(obj){
		$(obj).removeClass('ov-dn');
		obj = obj.parentNode.parentNode;
		$(obj).children('ul').remove();
	}

	this.transform_array = function(arr){

	}

	this.transform_object = function(obj){

	}
	//initialize bind event
	!ObjectView.instance && this.bindCommonEvent();
}

function get_object_view(obj,target){
	if( !ObjectView.instance ){
		new ObjectView();
	}
	var timestamp = new Date().getTime();
	if( !obj._dg_t ){
		//if it's the element,do not store data,just get remotely
		ObjectView.data[timestamp] = obj;
	}

	var str = ObjectView.instance.draw_init(obj,timestamp);

	if( target ){
		target.innerHTML = str;
		target = null;
	}else{
		return str;
	}
}