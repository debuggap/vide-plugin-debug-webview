function initNetwork(){
    //global variable
    _network = {};
    _network.requests = {}
    _network.filterRequests = _network.requests;
    _network.filterType = 'all';
    _network.request = {};
    _network.jsonObj = {};

    //add the event for the tr click
    $('#network .net-list').delegate("tr",'click',function(){
        var id = this.id.substr(3);
        var request = _network.requests[id];
        $('#network .net-list tr').removeClass('active');
        $(this).addClass('active')
        job._showNetDetail(request);
        _network.request = request;
    });
    //close the detail page for network
    $('#network .detail-head a').on('click',function(){
        job._hideNetDetail();
    });

    //listen event for detail head tab
    $('#network .detail-head li').on('click',function(){
        $('#network .detail-head li').removeClass('active');
        $(this).addClass('active');
        $('#network .req-detail div:gt(0)').hide();
        $('#network .detail-'+$(this).html().toLowerCase()).show();
        //display related section
		switch($(this).text()){
			case 'Headers':job._setRequestHeaders(_network.request);break;
			case 'Preview':job._setRequestPreview(_network.request);break;
			case 'Response':job._setRequestResponse(_network.request);break;
		}
        
    });

    //listen node extend event in the preview block
    $('#network').delegate("span.e-rt",'click',function(){
        //call function in the element.js file,in order to get the relation
        var relation = job._getRelation(this.parentNode.parentNode);
        if( $(this).hasClass('e-dn') ){
            $(this).removeClass('e-dn');
            //clean the chilren
            job._cleanPreviewChildren(relation);
        }else{
            $(this).addClass('e-dn');
            //add children
            job._findResponseValue(relation,_network.jsonObj);
        }
    });

    //add event on the filter span
    $('#network .filter .f-item').on('click',function(){
        $('#network .filter .f-item').removeClass('f-active');
        $(this).addClass('f-active');
        //filter the request
        job._filterRequestByType($(this).text());
    });

    //add event for filter input
    $('#network .filter .f-input').on('keyup',function(){
        job._filterRequestByCon($(this).val());
    });

    //clean the requests
    $('#network .filter .f-clear').on('click',function(){
        job._clearRequests();
    });
}

$.extend(job,{
    //init request
    doInitRequest:function(request){
        request = JSON.parse(request);

		//if the request is from Debugger, so must forbid the request from other sources
		if( DGDebugger && DGDebugger.flag.network && !request.integrated ){
			return;
		}
		request.requestHeaders = this._upperCaseHeaders(request.requestHeaders);
        //restore this request;
        _network.requests[request.id] = request;

        job._getRequestType(request);
        if( request.filterType == _network.filterType || _network.filterType == 'all' ){
            job._drawInitRequest(request);
        }
    },

    //set the return result
    doResultRequest:function(response){
        response = JSON.parse(response);

		//if the request is from Debugger, so must forbid the request from other sources
		if( DGDebugger && DGDebugger.flag.network && !response.integrated ){
			return;
		}
		response.responseHeaders = this._upperCaseHeaders(response.responseHeaders);
		//difference:issue on the ios
		if( response.data ){
			var issueData = 0 && response.data.split("\r\n\r\n");
			if( issueData ){
				response.data = issueData[1] ? issueData[1] : issueData[0];
			}
		}

        //restore the respone
        jQuery.extend(_network.requests[response.id],response);

        if( _network.filterType == 'all' || _network.requests[response.id].filterType == _network.filterType ){
            job._drawResultRequest(response);
        }
    },

	_upperCaseHeaders:function(obj){
		var rt = {},str,i;
		for( i in obj ){
			str = i.replace(/^[a-z]|-[a-z]/g,function(a){return a.toUpperCase();});
			rt[str] = obj[i];
		}
		return rt;
	},

    _drawResultRequest:function(response){
        var tr = $('#net'+response.id);
        var tds = tr.children();
        tds.eq(2).text(response.statusCode);
        tds.eq(3).text(job._calSize(response.size));
        tds.eq(4).text(job._calTime(response.times));
    },

    _getRequestType:function(request){
        var pathname = request.location.pathname.toLowerCase();
        if( /\.js$/.test(pathname) ){
            request.filterType = "js";
        }else if( /\.css$/.test(pathname) ){
            request.filterType = "css";
        }else if( /\.(jpg|jpeg|gif|png|bmp)$/.test(pathname) ){
            request.filterType = "image";
        }else if( request.requestHeaders.XHR ){
            request.filterType = "xhr";
        }else{
            request.filterType = "document";
        }
    },

    _drawInitRequest:function(request){
        var tr = job._addNetTr();
        tr.attr('id',"net"+request.id);
        //set the value
        var tds = tr.children();
        var pathname = request.location.pathname.toLowerCase();

        if( request.filterType == 'js' ){
            tds.eq(0).find('img').attr('src','css/images/resourceJSIcon.png');
        }else if( request.filterType == 'css' ){
            tds.eq(0).find('img').attr('src','css/images/resourceCSSIcon.png');
        }else if( request.filterType == 'image' ){
            tds.eq(0).find('img').attr('src',request.location.href);
            tds.eq(0).find('img').attr('style','padding:2px 3px;width:25px;height:28px;');
        }else if( request.filterType == 'xhr' ){
            tds.eq(0).find('img').attr('src','css/images/resourcePlainIcon.png');
        }else{
            tds.eq(0).find('img').attr('src','css/images/resourceDocumentIcon.png');
        }
        //assign the image ,name and path
        var pos = pathname.lastIndexOf('/')+1;
        request.filename = pathname.substr(pos);
        tds.eq(0).find('span:eq(0)').text(request.filename);
        tds.eq(0).find('span:eq(1)').text(request.location.host+pathname.substr(0,pos));
        tds.eq(1).html(request.method);
        tds.eq(2).html('pending');
    },

    _calSize:function(num){
        var str = num +"";
        var i = Math.ceil(str.length/3)-1;
        if( i == 0 ){
            str = num +"b";
        }else if( i == 1 ){
            str = (num/1000+"").slice(0,-2) +" KB";
        }else {
            str = (num/1000000+"").slice(0,-5) +" MB";
        }
        return str;
    },

    _calTime:function(num){
        var str = num +"";
        var i = Math.ceil(str.length/3)-1;
        if( i == 0 ){
            str = num +"ms";
        }else{
            str = (num/1000+"").slice(0,-2) +"s";
        }
        return str;
    },

    //add the tr to the table
    _addNetTr:function(){
        $('#network .net-list tbody').append('<tr><td class="req-url"><div class="info"><img /><div class="addr"><span></span><span class="path"></span></div></div></td><td class="req-method"></td><td class="req-status"></td><td class="req-size"></td><td class="req-time"></td></tr>');
        var last = $('#network .net-list tbody tr:last');
        if( $('#network .net-list tbody tr').length % 2 == 0 ){
            last.addClass('even');
        }
        return last
    },

    //show the request detail layer
    _showNetDetail:function(request){
        if( !$('#hideAllNetDetail').length ){
            $('#network .req-detail').show();
            $('#network .req-list').css('width','600px');
            $('#network').append('<style id="hideAllNetDetail">#network .req-method,.req-size,.req-type,.req-time,.req-status{display:none !important;}</style>');
        }

        //set request header
        job._setRequestHeaders(request);

        //set response
        job._setRequestResponse(request);

        //set preview
        job._setRequestPreview(request);
    },

    //set preview
    _setRequestPreview:function(request){

        //add the preview
		if( !request.responseHeaders ){
			$('#network .detail-preview').html('');
		}else if( request.responseHeaders['Content-Type'] && request.responseHeaders['Content-Type'].substr(0,5) == 'image' ){
            job._setImagePreview(request);
        }else{
            try{
                var jsonObj = JSON.parse(request.data);
                if( typeof jsonObj != 'object' ){
                    throw "not object";
                }
                get_object_view(jsonObj,$('#network .detail-preview')[0]);
                _network.jsonObj = jsonObj;
            }catch(err){
                $('#network .detail-preview').html("<pre>"+htmlspecialchars(request.data)+"</pre>");
            }
        }
    },

    //set the image preivew
    _setImagePreview:function(request){
        $('#network .detail-preview').html('<div class="detail-preview-img">'+
            '<img src="" /><p></p>'+
            '<table width="100%" cellspadding="0" cellspacing="0">'+
            //'<tr><td class="preview_title" width="50%">Dimensions</td><td class="preview_con"></td></tr>'+
            '<tr><td class="preview_title">File size</td><td class="preview_con"></td></tr>'+
            '<tr><td class="preview_title">URL</td><td class="preview_con"></td></tr>'+
            '</table></div>');

        //set the properties
        $('#network .detail-preview-img img').attr('src',request.location.href);
        $('#network .detail-preview-img p').text(request.filename);
        jQuery.each($('#network .detail-preview-img .preview_con'),function(a,b){
            if( a == 0){
                $(this).html(job._calSize(request.size));
            }else if( a == 1){
                $(this).html('<a target="_blank" href="'+request.location.href+'">'+request.location.href+'</a>');
            }
        });
    },

    //clean the chilren
    _cleanPreviewChildren:function(relation){
        //compose filter
        var filter = $("#network .ele ");
        for(var i=0;i<relation.length;i++){
            var key = relation[i];
            filter = filter.find("ul:eq(0)").children().eq(key);
        }
        filter.find('ul').remove();
    },
    _findResponseValue:function(relation,obj){
        //get the target obj
        var jsonObj = obj;
        if( relation.length ){
            for( var i=0;i<relation.length;i++){
                var j=0;
                jQuery.each(jsonObj,function(a,b){
                    if( j++ == relation[i] && typeof b == "object" ){
                        jsonObj = b;
                        return false;
                    }
                });
            }
        }
        //construct the tree node
        var str = "",con,item;
        var conArr,hasObject=-1;
        if( typeof jsonObj == 'object' ){
            conArr = [];hasObject=0;
            jQuery.each(jsonObj,function(i,item){
                if( jQuery.isArray(item) ){
                    conArr.push({ con : i+':<span class="e-txt">Array['+item.length+']</span>',object:1});
                    hasObject = 1;
                }else if( jQuery.isPlainObject(item) ){
                    conArr.push( { con : i+':<span class="e-txt">Object</span>',object:1} );
                    hasObject = 1;
                }else{
                    if( typeof item == "string" ){
                        item = '<span class="e-pv">"'+item+'"</span>';
                    }else{
                        item = '<span class="e-txt">'+item+'</span>';
                    }
                    conArr.push( i+":"+item );
                }
            });
        }else{
            str = request.data;
        }
        //deal with data which maybe contains object
        if( hasObject != -1 ){
            if( relation.length && !hasObject ){
                hasObject = 1;
            }
            var style = ( relation.length+hasObject) * 16;
            var style1 = relation.length * 16;
            str = '<ul>';
            for( var i=0;i<conArr.length;i++){
                if( typeof conArr[i] == 'string' ){
                    str += '<li><div class="e-tl"><span class="e-sp" style="width:'+style+'px"></span><div class="e-ele">'+conArr[i]+'</div></div></li>';
                }else{
                    str += '<li><div class="e-tl"><span class="e-sp" style="width:'+style1+'px"></span><span class="e-rt"></span><div class="e-ele">'+conArr[i].con+'</div></div></li>';
                }
            }
            str += '</ul>';
        }
        var filter = $('#network .detail-preview .ele');
        for(var i=0;i<relation.length;i++){
            var key = relation[i];
            filter = filter.find("ul:eq(0)").children().eq(key);
        }
        filter.append(str);
    },

    //set response
    _setRequestResponse:function(request){
        //add the response
        if( request.data ){
            $('#network .detail-response').text(request.data);
        }else{
            $('#network .detail-response').html("<h1>There is no response data</h1>");
        }
    },

    //set request header
    _setRequestHeaders:function(request){
        //add the url ,method and status code
        var str = "<ul>";
        str += "<li><span>Request URL: </span>"+request.location.href+"</li>";
        str += "<li><span>Request Method: </span>"+request.method.toUpperCase()+"</li>";
        str += "<li><span>Status Code: </span>"+request.statusCode+"</li>";

        //add the request headers
        str += "<li><span>Request Headers</span><ul>";
        for( var i in request.requestHeaders ){
            if( i != 'data')
                str += "<li><span>"+ i +": </span>"+request.requestHeaders[i]+"</li>";
        }
        str += "</ul></li>";

        //add the request payload
        if( request.payload ){
            str += "<li><span>Request Body: </span><ul><li>"+request.payload+"</li></ul></li>";
        }
        //add the response Headers
        str += "<li><span>Response Headers</span><ul>";
        for( var i in request.responseHeaders ){
            str += "<li><span>"+ i.replace(/^[a-z]|-[a-z]/g,function(a){return a.toUpperCase()})+": </span>"+request.responseHeaders[i]+"</li>";
        }
        str += "</ul></li></ul>";
        $('#network .detail-headers').html(str);
    },

    //hide the request detail layer
    _hideNetDetail:function(){
        $('#network .req-detail').hide();
        $('#network .req-list').css('width','inherit');
        $('#hideAllNetDetail').remove();
        $('#network .net-list tr').removeClass('active');
    },

    //filter the request by type
    _filterRequestByType:function(text){
        var type = 'all';
        switch(text){
            case 'Scripts':type = 'js';break;
            case 'Styleheets':type = 'css';break;
            case 'Images':type = 'image';break;
            case 'XHR':type = 'xhr';break;
            case 'Documents':type = 'document';break;
            default: type = 'all';break;
        }
        var result = _network.requests;
        _network.filterType = type;
        if( type != 'all' ){
            result = jQuery.map(_network.requests,function(item){
                if( item.filterType == type ){
                    return item;
                }
            });
        }
        _network.filterRequests = result;

        job._filterRequestByCon( $('#network .filter .f-input').val() );
    },

    //filter by the special con
    _filterRequestByCon:function(con){
        var reg = new RegExp(con,'i'),str;
        var result = jQuery.map(_network.filterRequests,function(item){
            str = item.location.href +" "+item.method+" "+item.statusCode;
            if( reg.test(str) ){
                return item;
            }
        });
        job._hideNetDetail();
        job._filterRequestToList(result);
    },

    //display request items accrodingly
    _filterRequestToList:function(result){
        //clear the list
        $('#network .net-list tbody').html('');

        //draw again;
        jQuery.each(result,function(index,item){
            job._drawInitRequest(item);
            job._drawResultRequest(item);
        });
    },

    _clearRequests:function(){
        _network.requests = {}
        _network.filterRequests = _network.requests;
        _network.request = {};

        //clear the list
        $('#network .net-list tbody').html('');
    }
});