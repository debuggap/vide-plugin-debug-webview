function initResource(){

	_resource = {};
	$( ".r-separate" ).draggable({ 
		containment: ".r1-wrap", 
		scroll: false,
		axis:'x',
		start:function(){
			this.tdLeft = $('#resources tr td span').map(function(a){if( a%2== 0)return this;});
			this.tdRight = $('#resources tr td span').map(function(a){if( a%2!= 0)return this;});
		},
		drag:function(){
			$( ".r-separate" ).css({height:$('.right1 table').height()});
			var minLeft = 100;
			var total = $('.r1-wrap').width();
			var maxLeft = total - minLeft;
			var left = Math.floor( $(this).position().left );
			
			var tdLeft = this.tdLeft;
			var tdRight = this.tdRight;
			if( left < minLeft ){
				$(this).css('left',minLeft+'px');
				var value = (minLeft-20)+'px';
				tdLeft.css({'width':value});
				var right = total - minLeft -40;
				tdRight.css({'width':right});
				return false;
			}else if( left > maxLeft ){
				$(this).css('left',maxLeft+'px');
				var value = (maxLeft-20)+'px';
				tdLeft.css({'width':value});
				var right = total - maxLeft -40;
				tdRight.css({'width':right});
				return false;
			}else{
				var value = (left-20)+'px';
				tdLeft.css({'width':value});
				
				var right = total - left -40;
				tdRight.css({'width':right});
			}
		}
	});
	
	//for click on the tr 
	_resource.preTr=null;
	$('.r1-wrap').delegate("tr:not(.r1-title)",'click',function(){
		if( _resource.preTr ) {
			$(_resource.preTr).removeClass('active');
		}
		_resource.preTr = this;
		$(this).addClass('active');
	});
	
	//init resources
	$(".left1 a").on('click',function(e){
		
		var self = this;
		$(".left1 a").each(function(){
			if( self == this ){
				$(this).addClass("active");
			}else{
				$(this).removeClass('active');
			}
		});
		var id = $(this).attr('targetId');
		toDistribute(id);
		job.resourceDisplay(id);	
		
		return false;
	});
	//involk the delete button
	$(document).bind('keyup',function(e){
		//when involk delete button
		if( e.keyCode ==  46 && $('.head li.active').attr('targetid') == 'resources' ){
			//if there is one item selected
			if( _resource.preTr ) {
				//change the current focus item
				if( _resource.preTr.nextSibling ){
					var tmp = _resource.preTr.nextSibling;
				}else if( _resource.preTr.previousSibling && _resource.preTr.previousSibling.className != 'r1-title' ){
					var tmp = _resource.preTr.previousSibling;
				}
				//delete data in the remote machine
				job.toDelData( $(_resource.preTr).children().first().text() );
				$(_resource.preTr).remove();
				//redraw the line 
				redrawLine();
				_resource.preTr = tmp;
				$(_resource.preTr).addClass('active');
			}
		};
		return false;
	});
	
	function redrawLine(){
		var trs = $('#resources table tr').not('.r1-title');
		for( var i=0;i<trs.length;i++){
			if( i%2 == 0 ){
				trs.eq(i).removeClass();
			}else{
				trs.eq(i).addClass('r1-r');
			}
		}
		job.changeLine();
	}
}

$.extend(job,{
	doCookie:function(data){
		data = $.trim(data);
		if( data.length ){
			var arr = data.split(';');
			var obj = {};
			for( var i=0;i<arr.length;i++ ){
				var tmp = arr[i];
				var index = tmp.indexOf('=');
				var key = $.trim(tmp.substring(0,index));
				key && ( obj[key] = tmp.substring(index+1) );
			}
			_resource.cookie = obj;
		}
	},
	doLocalStorage:function(data){
		if( data.length ){
			_resource.localStorage = JSON.parse(data);
		}
	},
	doSessionStorage:function(data){
		_resource.sessionStorage = JSON.parse(data);
	},
	//store the previous resource type to display
	_preResourceType:'',
	//refresh the table
	refreshDisplay:function(type){
		if( !type || type == job._preResourceType )
			job._preResourceType && job.resourceDisplay(job._preResourceType);
	},
	resourceDisplay:function(type){
		
		this._preResourceType = type;
		var data = _resource[type] ? _resource[type] : {};
		var keys = Object.keys(data);
		keys.sort();
		var classes="";
		var str='<tr class="r1-title"><td class="r1-t1">Key</td><td>Value</td></tr>';
		$('.right1 table tr').remove();
		for( var i=0;i<keys.length;i++){
			if( i %2 == 1 ){
				classes = 'class="r1-r"';
			}else{
				classes = "";
			}
			str += ( "<tr "+classes+"><td><span>"+keys[i]+"</span></td><td><span>"+data[keys[i]]+"</span></td></tr>" );
		}
		$('.right1 table').append(str);
		
		//set the height of line-separate
		this.changeLine();
		//reset width of table
		this.resetWidth();
	},
	//set the height of line-separate
	changeLine:function(){
		$( ".r-separate" ).css({height:$('.right1 table').height()});
	},
	//reset width of table
	resetWidth:function(){
		var left = 200;
		var right = $('.r1-wrap').width() -200-40;
		$('#resources tr td span').map(function(a){if( a%2== 0)return this;}).css({width:left});
		$( ".r-separate" ).css({left:left+20});
		$('#resources tr td span').map(function(a){if( a%2!= 0)return this;}).css({width: right});
	}
});

$.extend(job,{
    toLocalStorage:function(){
        send("localStorage:");
    },
    toSessionStorage:function(){
        send("sessionStorage:");
    },
    toCookie:function(){
        send("cookie:");
    },
    toFileTree:function(){
        send("fileTree:");
    },
    //delete localStorage
    toDelData:function(key){
        switch( this._preResourceType){
            case 'sessionStorage':send("delSessionStorage:"+key);break;
            case 'localStorage':send("delLocalStorage:"+key);break;
            case 'cookie':send("delCookie:"+key);break;
        }
    }
});