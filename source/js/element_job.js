/*
*	communication with remote client to get and send node information
*/
$.extend(job,{
	doChildrenList:function(data){
		var timestamp = data.slice(0,13);
		data = data.slice(14);
		if( job._nodeCallbacks[timestamp] ){

			var index = data.indexOf(';');
			var relation = data.substr(0,index);
			relation = relation == '' ? [] :relation.split(',');
			data = data.substr(index+1);
			data = JSON.parse(data);

			job._nodeCallbacks[timestamp].call(job,relation,data);
			job._nodeCallbacks[timestamp] = null;
			delete job._nodeCallbacks[timestamp];
		}
		_element.element_instance.resetElementBlock();
	},
	_nodeCallbacks:{},
	_getChildrenList:function(relation,func){
		var timestamp = new Date().getTime();
		job._nodeCallbacks[timestamp] = func;
		send("getChildrenV2:"+timestamp+';'+relation);
	}
});