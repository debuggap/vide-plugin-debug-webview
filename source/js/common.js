var gui = require('n'+'w.g'+'u'+'i');
var _window = gui.Window.get();
window.manifest = gui['A'+'pp']['m'+'an'+'if'+'es'+'t'];

//set width and height
if( /child\.html$/.test(location.pathname) ){
   _window.maximize(); 
}
//_window.resizeTo(manifest.window.min_width,manifest.window.min_height);
