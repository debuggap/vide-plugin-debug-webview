function initGlobalEvent(){
	//global event
	$(window).bind('resize',function(){
		//refresh for the resource page
		job.refreshDisplay();
		
		//refresh for the console page 
		job._refreshConsoleForPre(true);
	});
	

	$(window).bind('keydown',function(e){
		//prevent the ctrl+s event
		if( e.ctrlKey && e.keyCode == 83 ){
			e.preventDefault();
			//if there is one page in the modification,trigger the save button event.
			if( $('#sTabs li.li-active').length ){
				var id = $('#sTabs li.li-active').attr('target');
				//if the edit button is hidden, it means it's in the edit mode
				if( $('#sTabs div.file-con#'+id+' .edit-file span:first').css('display') == "none" ){
					//trigger the save button event
					$('#sTabs div.file-con#'+id+' .edit-file span').eq(1).trigger('click');
				}
			}
		}else if( e.keyCode == 9 ){
			//prvent the tab event
			e.preventDefault();
		}else if( e.keyCode == 116 || e.ctrlKey && e.keyCode == 82 ){
			//refresh event
			location.reload();
		}
	});
};
