$(document).ready(function(){
	
	function load(){

		var trackEvent = $('#track iframe')[0].contentWindow.trackEvent;
		
		if( !trackEvent ){
			return;
		}

		//track the tab
		$('.head ul li').bind('click',function(){
		  try{
			trackEvent(['_trackEvent', 'Tool Tab', 'focus', $(this).text()]);
		  }catch(e){}
		});

		//track the google search
		(function(count){
			if( document.querySelector('.gsc-wrapper') ){					
				$('.gsc-input-box input').bind('click',function(){
					trackEvent(['_trackEvent', 'Tool Tab', 'focus', 'Google Search']);
				});
			}else if(count<100){
				var fun = arguments.callee;
				setTimeout(function(){fun(++count)},500);
			}
		})(1);

		//track resources information
		$('#resources .left1 a').bind('click',function(){
			trackEvent(['_trackEvent', 'resources', 'select', $(this).text()]);
		});
	}

	var str = '<div id="track" style="display:none;"><iframe src="http://www.debuggap.com/tooltrack/index.html" style="display:none;"></iframe></div>';
	$(document.body).append(str);
	$('#track iframe')[0].onload = load;
});