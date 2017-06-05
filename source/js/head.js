function initHead(){
	//init head binding
	$(".head li").bind('click',function(){
		var self = this;
		$(".head li").each(function(){
			if( self == this ){
				$(this).addClass("active");
				$("#"+$(this).attr('targetId')).show();
			}else{
				$(this).removeClass('active');
				$("#"+$(this).attr('targetId')).hide();
			}
		});
	});

	$('.head .inspect').bind('click',function(){
		if( $(this).hasClass('action') ){
			$(this).removeClass('action');
			job._closeInspect();
		}else{
			$(this).addClass('action');
			job._startInspect();
		}
	})
}

$.extend(job,{
	_startInspect:function(){
		send("startInspect:");
	},
	_closeInspect:function(){
		send("closeInspect:");
	},

	doCloseInspect:function(){
		$('.head .inspect').removeClass('action');
	}
});