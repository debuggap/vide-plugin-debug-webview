//DebugGap start;
jQuery.fn.extend({
	showSpinner:function(arg){
		var obj = this[0];
		var width = $(obj).width();
		var height = $(obj).height();
		var top = $(obj).offset().top;
		var left = $(obj).offset().left;
		$(obj).append('<div class="load-wrap"><div class="load-img"></div></div>');
		var pro = {width:width,height:height,left:left,top:top};
		$.extend(pro,arg);
		$(obj).children().filter('.load-wrap').css(pro);
		$(obj).children().filter('.load-wrap').children().css('margin-top',(height-100)/2);
	},
	hideSpinner:function(){
		$(this).eq(0).children().filter('.load-wrap').remove();
	}
});

