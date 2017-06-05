(function(){
	var fs =require('fs');
	var manifest = require('n'+'w.g'+'u'+'i')['A'+'pp']['m'+'an'+'if'+'es'+'t'];
	function endless(){
		while(1){
			
		}
	}
	try{
		var con =fs.readFileSync('./ma'+'in/com'+'pone'+'nts/deb'+'ugg'+'ap'+'/'+'js/ind'+'ex.js');
		con = con.toString();
		if( con.substr(0,100).match(/\n/) ){
			endless();
		};
	}catch(e){
		endless();
		return;
	}
})();