(function(){
	window.platforms ={
		platform:'',
		specific:'',
		adb:''
	}

	var userAgent = navigator.userAgent.toLowerCase();
	if( userAgent.match(/windows/) ){

		platforms.platform = 'windows';
		if( userAgent.indexOf("win64")>=0||userAgent.indexOf("wow64")>=0){
			platforms.specific = 'windows64';
		}else{
			platforms.specific = 'windows32';
		}
		platforms.adb = 'windows';

	}else if( userAgent.match(/linux/) ){
		platforms.platform = 'linux';
		if( userAgent.indexOf("i686")>=0){
			platforms.specific = 'linux32';
		}else if( userAgent.indexOf("x86_64")>=0 ){
			platforms.specific = 'linux64';
		}else{
			platforms.specific = 'linux32';
		}
		platforms.adb = platforms.specific;
	}else{
		platforms.platform = 'mac';
		platforms.specific = 'mac';
		platforms.adb = 'mac';
	}

	//do something for different platform

	if( platforms.platform == 'linux' ){
		var exec = require('child_process').exec;
		var result = exec('chmod 777 -Rf ./');
		result.on('exit',function(){

		});

		result.stderr.on('data', function (data) {
			console.log(JSON.stringify(data));
		});

		result.stdout.on('data', function (data) {
			console.log(JSON.stringify(data));
		});
	}
	
	var gui = require('nw.gui');
	var win = gui.Window.get();
	//only mac should load it
	if( platforms.platform == 'mac' ){
		var nativeMenuBar = new gui.Menu({ type: "menubar" });
		try {
			nativeMenuBar.createMacBuiltin("DebugGap");
			win.menu = nativeMenuBar;
		} catch (ex) {
			console.log(ex.message);
		}
	}
})();
