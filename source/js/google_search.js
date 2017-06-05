(function() {
	var cx = '003009295147407166772:1ds-4mfkeak';
	var gcse = document.createElement('script');
	gcse.type = 'text/javascript';
	gcse.async = true;
	gcse.src = (document.location.protocol == 'https:' ? 'https:' : 'http:') +
		'//www.google.com/cse/cse.js?cx=' + cx;
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(gcse, s);
	var loaded = 0;
	gcse.onload = function(){
		$('.search_section .search_span').remove();
		loaded = 1;
	}
	function error(){
		$('.search_section .search_span').text("Failed to load");
		$('.search_section').fadeOut(30000);
	}
	gcse.onerror = error;

	setTimeout(function(){
		if( !loaded ){
			error();
		}
	},50000);
	
	gcse = null;
	s = null;
})();

(function(count){
	
	if( document.querySelector('.gsc-wrapper') ){
		
		//if there is no iframe, just create it.
		if( !document.querySelector('#search_browser') ){
			var ele = document.createElement('div');
			ele.id = "search_browser";
			ele.className = "search_browser";

			$(ele).append('<div class="search_head"><span class="mini_window top_btn" title="Minimize Window"></span><span class="search_back top_btn" title="Back"></span><span class="search_refresh top_btn" title="Refresh"></span><span class="search_load top_btn"></span><span class="new_window top_btn" title="New Window"></span></div><iframe id="inner_browser" border=0 nwdisable nwfaketop></iframe>')

			var rect = $('.gsc-results-wrapper-overlay')[0].getBoundingClientRect();
			$(ele).css({width:rect.width,height:rect.height,left:rect.left,top:rect.top});
			$('.gsc-results-wrapper-overlay').after(ele);
			$("#inner_browser").css({width:rect.width,height:rect.height-30,border:'0px'});

			//add the onload Event for the inner_browser
			document.getElementById('inner_browser').onload = function(){
				var innerWindow = document.getElementById('inner_browser').contentWindow;
				var ele = innerWindow.document.createElement('base');
				ele.setAttribute('target','_self');
				innerWindow.document.head.appendChild(ele);
				$('.search_section .search_load').hide();
			}
		}
		
		//add the max window label
		if( !document.querySelector('.max_window') ){
			$('.gsc-input-box').after('<div class="max_window">Maximize Window</div>');
			var rect = $('.gsc-input-box')[0].getBoundingClientRect();
			$('.max_window').css({width:rect.width,height:rect.height,left:rect.left,top:rect.top});
		}

		//once the window resizes, do the following function
		$(window).resize(function(){
			if( document.querySelector('#search_browser') ){
				var rect = $('.gsc-results-wrapper-overlay')[0].getBoundingClientRect();
				$('#search_browser').css({width:rect.width,height:rect.height,left:rect.left,top:rect.top});
				$("#inner_browser").css({width:rect.width,height:rect.height-30,border:'0px'});
			}
		});	
		
		//when click the link, open with inner iframe
		$('.gsc-wrapper').on('click','a',function(e){				
			
			$("#inner_browser").attr('src','');
			var href = $(this).attr('href');
			//use the timeout to clear the previous page shadow.
			setTimeout(function(){
				//set the url to iframe, start to load the data.
				$("#inner_browser").attr('src',href);
				$('.search_section .search_load').show();
				$('#search_browser').css({'-webkit-transform':'rotateZ(0deg)'});
			},50);

			e.preventDefault();
			e.stopPropagation();
		});

		//when close the gsc overlay, also delete the iframe dom.
		$('.gsc-results-wrapper-overlay,.gsc-modal-background-image').bind('click',function(){
			$('#search_browser').css({'-webkit-transform':'rotateZ(-90deg)'});
		});

		
		$('.max_window').bind('click',function(){
			$(this).hide();
			$('.gsc-control-wrapper-cse .search_browser').show();
			$('.gsc-control-wrapper-cse .gsc-results-wrapper-overlay').addClass('gsc-results-wrapper-visible');
			$('.gsc-control-wrapper-cse .gsc-modal-background-image').addClass('gsc-modal-background-image-visible');
		});

		//add event for back and new window button
		$('.search_section').on('click','span',function(e){
			if( $(this).hasClass('top_btn') ){
				if( $(this).hasClass('search_refresh') ){
					//refresh the page.
					$('.search_section .search_load').show();
					$("#inner_browser")[0].contentWindow.location = $("#inner_browser").attr('src');
				}else if( $(this).hasClass('search_back') ){
					//display the result list
					$('#search_browser').css({'-webkit-transform':'rotateZ(-90deg)'});
				}else if( $(this).hasClass('mini_window') ){
					//close the window.
					$('.gsc-control-wrapper-cse .search_browser').hide();
					$('.gsc-control-wrapper-cse .gsc-results-wrapper-overlay').removeClass('gsc-results-wrapper-visible');
					$('.gsc-control-wrapper-cse .gsc-modal-background-image').removeClass('gsc-modal-background-image-visible');
					//add the show button on the search box
					$('.max_window').show();
				}else{
					//open the new window in the default browser
					var gui = require('nw.gui');
					gui.Shell.openExternal($("#inner_browser").attr('src'));
				}
			}
		});

	}else if(count<100){
		var fun = arguments.callee;
		setTimeout(function(){fun(++count)},500);
	}
})(1);

//add the component to head section
$(document).ready(function(){
	$('.head:eq(0)').append('<div class="search_section"><span class="search_span">Google Search is Loading...</span><gcse:search></gcse:search></div>');
});

//add the event listener for double-press shift button
(function(){
	var times = 0;
	var timeout;
	$(window).bind('keydown',function(e){
		if( e.keyCode == 16 ){
			times ++;
			if( times == 1 ){
				timeout = setTimeout(function(){
					times = 0;
				},300);	
			}else if( times ==2 ){
				times = 0;
				clearTimeout(timeout);
				if( $('.search_section .max_window').css('display') != "block" ){
					document.querySelector('.search_section input.gsc-input').focus();
					e.preventDefault();
				}
			}else{
				times = 0;	
			};
		}
	});
})();