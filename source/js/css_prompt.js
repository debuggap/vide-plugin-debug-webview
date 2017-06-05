function CssPrompt(obj){

	//box prefix
	this.boxprefix = 'css_prompt_temp';
	this.listprefix = 'css_prompt_list';

	obj && (this.events = obj);
	
	this.getPrompt = function(value,callback){
		var arr=[];
		var properties = this.properties;
		if( value ){
			var reg = new RegExp('^'+value,'i');
			for( var i=0,len=properties.length;i<len;i++){
				if( reg.test(properties[i]) ){
					arr.push(properties[i]);
				}
			}
		}
		callback(arr);
	}

	this.getPromptValue = function(key,value,callback){
		//first get value directly
		var result = this.values[key];
		//if doesn't exist,using regular expression
		if( !result ){
			result = this.getValueByReg(key);
			!result && (result = []);
		}
		result = result.concat(["inherit","initial"]);
		result.sort();

		var arr = [];
		if( result ){
			var reg = new RegExp('^'+value,'i');
			for( var i=0,len=result.length;i<len;i++){
				if( reg.test(result[i]) ){
					arr.push(result[i]);
				}
			}
		}
		callback(arr);
		
	}

	this.getValueByReg = function(key){
		var keys = Object.keys(this.values),reg,value=null;
		for( var i=0,len=keys.length;i<len;i++){
			reg = new RegExp(keys[i]);
			if( reg.test(key) ){
				value = this.values[keys[i]];
				break;
			}
		}
		return value;
	}

}

CssPrompt.prototype = Prompt.prototype;
CssPrompt.prototype.properties = JSON.parse('["align-content","align-items","align-self","alignment-baseline","backface-visibility","background","background-attachment","background-blend-mode","background-clip","background-color","background-image","background-origin","background-position","background-position-x","background-position-y","background-repeat","background-size","baseline-shift","border","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-shadow","box-sizing","buffered-rendering","caption-side","clear","clip","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-rendering","cursor","direction","display","dominant-baseline","empty-cells","fill","fill-opacity","fill-rule","filter","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","flood-color","flood-opacity","font","font-family","font-kerning","font-size","font-stretch","font-style","font-variant","font-variant-ligatures","font-weight","glyph-orientation-horizontal","glyph-orientation-vertical","height","image-rendering","justify-content","left","letter-spacing","lighting-color","line-height","list-style","list-style-image","list-style-position","list-style-type","margin","margin-bottom","margin-left","margin-right","margin-top","marker-end","marker-mid","marker-start","mask","mask-type","max-height","max-width","min-height","min-width","object-fit","object-position","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-wrap","overflow-x","overflow-y","padding","padding-bottom","padding-left","padding-right","padding-top","page-break-after","page-break-before","page-break-inside","paint-order","perspective","perspective-origin","pointer-events","position","resize","right","shape-image-threshold","shape-margin","shape-outside","shape-rendering","speak","stop-color","stop-opacity","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","tab-size","table-layout","text-align","text-anchor","text-decoration","text-indent","text-overflow","text-rendering","text-shadow","text-transform","top","touch-action","transform","transform-origin","transform-style","transition","transition-delay","transition-duration","transition-property","transition-timing-function","unicode-bidi","vector-effect","vertical-align","visibility","-webkit-animation","-webkit-animation-delay","-webkit-animation-direction","-webkit-animation-duration","-webkit-animation-fill-mode","-webkit-animation-iteration-count","-webkit-animation-name","-webkit-animation-play-state","-webkit-animation-timing-function","-webkit-app-region","-webkit-appearance","-webkit-backface-visibility","-webkit-background-clip","-webkit-background-composite","-webkit-background-origin","-webkit-background-size","-webkit-border-after","-webkit-border-after-color","-webkit-border-after-style","-webkit-border-after-width","-webkit-border-before","-webkit-border-before-color","-webkit-border-before-style","-webkit-border-before-width","-webkit-border-end","-webkit-border-end-color","-webkit-border-end-style","-webkit-border-end-width","-webkit-border-horizontal-spacing","-webkit-border-image","-webkit-border-start","-webkit-border-start-color","-webkit-border-start-style","-webkit-border-start-width","-webkit-border-vertical-spacing","-webkit-box-align","-webkit-box-decoration-break","-webkit-box-direction","-webkit-box-flex","-webkit-box-flex-group","-webkit-box-lines","-webkit-box-ordinal-group","-webkit-box-orient","-webkit-box-pack","-webkit-box-reflect","-webkit-box-shadow","-webkit-clip-path","-webkit-column-break-after","-webkit-column-break-before","-webkit-column-break-inside","-webkit-column-count","-webkit-column-gap","-webkit-column-rule","-webkit-column-rule-color","-webkit-column-rule-style","-webkit-column-rule-width","-webkit-column-span","-webkit-column-width","-webkit-columns","-webkit-filter","-webkit-font-feature-settings","-webkit-font-smoothing","-webkit-highlight","-webkit-hyphenate-character","-webkit-line-box-contain","-webkit-line-break","-webkit-line-clamp","-webkit-locale","-webkit-logical-height","-webkit-logical-width","-webkit-margin-after","-webkit-margin-after-collapse","-webkit-margin-before","-webkit-margin-before-collapse","-webkit-margin-bottom-collapse","-webkit-margin-end","-webkit-margin-start","-webkit-margin-top-collapse","-webkit-mask-box-image","-webkit-mask-box-image-outset","-webkit-mask-box-image-repeat","-webkit-mask-box-image-slice","-webkit-mask-box-image-source","-webkit-mask-box-image-width","-webkit-mask-clip","-webkit-mask-composite","-webkit-mask-image","-webkit-mask-origin","-webkit-mask-position","-webkit-mask-position-x","-webkit-mask-position-y","-webkit-mask-repeat","-webkit-mask-size","-webkit-max-logical-height","-webkit-max-logical-width","-webkit-min-logical-height","-webkit-min-logical-width","-webkit-padding-after","-webkit-padding-before","-webkit-padding-end","-webkit-padding-start","-webkit-perspective","-webkit-perspective-origin","-webkit-print-color-adjust","-webkit-rtl-ordering","-webkit-ruby-position","-webkit-tap-highlight-color","-webkit-text-combine","-webkit-text-decorations-in-effect","-webkit-text-emphasis-color","-webkit-text-emphasis-position","-webkit-text-emphasis-style","-webkit-text-fill-color","-webkit-text-orientation","-webkit-text-security","-webkit-text-stroke-color","-webkit-text-stroke-width","-webkit-transform","-webkit-transform-origin","-webkit-transform-style","-webkit-transition","-webkit-transition-delay","-webkit-transition-duration","-webkit-transition-property","-webkit-transition-timing-function","-webkit-user-drag","-webkit-user-modify","-webkit-user-select","-webkit-writing-mode","white-space","widows","width","will-change","word-break","word-spacing","word-wrap","writing-mode","z-index","zoom"]');
CssPrompt.prototype.values = {
	//font
	"font-size":["xx-small", "x-small", "small", "medium", "large", "x-large", "xx-large", "smaller", "larger"],
	"font-style":["italic", "oblique", "normal"],
	"font-weight":["normal", "bold", "bolder", "lighter"],
	"font-variant": ["small-caps", "normal"],
	"font-family":["serif", "sans-serif", "cursive", "fantasy", "monospace", "-webkit-body", "-webkit-pictograph"],
	"text-transform": ["none", "capitalize", "uppercase", "lowercase"],
	"text-decoration":["blink", "line-through", "overline", "underline"],

	//background
	"background-repeat":["repeat", "repeat-x", "repeat-y", "no-repeat", "space", "round"],

	//word and letter
	"letter-spacing":["-webkit-autostart", "end", "left", "right", "center", "justify", "-webkit-left", "-webkit-right", "-webkit-center"],
	"vertical-align":["baseline", "middle", "sub", "super", "text-top", "text-bottom", "top", "bottom", "-webkit-baseline-middle"],
	"white-space":["normal", "nowrap", "pre", "pre-line", "pre-wrap"],
	"text-decoration":["none", "underline", "overline", "line-through", "blink"],
	"word-break":["break-all","break-word","normal"],
	"word-wrap":["break-word","normal"],

	//block
	"display":["none", "inline", "block", "list-item", "run-in", "compact", "inline-block", "table", "inline-table", "table-row-group", "table-header-group", "table-footer-group", "table-row", "table-column-group", "table-column", "table-cell", "table-caption", "-webkit-box", "-webkit-inline-box", "flex", "inline-flex", "grid", "inline-grid"],
	"visibility":["visible", "hidden"],
	"^overflow":["hidden", "auto", "visible", "overlay", "scroll"],

	//border
	"border(.*)-style":["none", "hidden", "inset", "groove", "ridge", "outset", "dotted", "dashed", "solid", "double"],

	//list
	"list-style-type":["none", "inline", "disc", "circle", "square", "decimal", "decimal-leading-zero", "arabic-indic", "binary", "bengali", "cambodian", "khmer", "devanagari", "gujarati", "gurmukhi", "kannada", "lower-hexadecimal", "lao", "malayalam", "mongolian", "myanmar", "octal", "oriya", "persian", "urdu", "telugu", "tibetan", "thai", "upper-hexadecimal", "lower-roman", "upper-roman", "lower-greek", "lower-alpha", "lower-latin", "upper-alpha", "upper-latin", "afar", "ethiopic-halehame-aa-et", "ethiopic-halehame-aa-er", "amharic", "ethiopic-halehame-am-et", "amharic-abegede", "ethiopic-abegede-am-et", "cjk-earthly-branch", "cjk-heavenly-stem", "ethiopic", "ethiopic-halehame-gez", "ethiopic-abegede", "ethiopic-abegede-gez", "hangul-consonant", "hangul", "lower-norwegian", "oromo", "ethiopic-halehame-om-et", "sidama", "ethiopic-halehame-sid-et", "somali", "ethiopic-halehame-so-et", "tigre", "ethiopic-halehame-tig", "tigrinya-er", "ethiopic-halehame-ti-er", "tigrinya-er-abegede", "ethiopic-abegede-ti-er", "tigrinya-et", "ethiopic-halehame-ti-et", "tigrinya-et-abegede", "ethiopic-abegede-ti-et", "upper-greek", "upper-norwegian", "asterisks", "footnotes", "hebrew", "armenian", "lower-armenian", "upper-armenian", "georgian", "cjk-ideographic", "hiragana", "katakana", "hiragana-iroha", "katakana-iroha"],
	"list-style-position":["outside", "inside", "hanging"],

	//position
	"position":["absolute", "fixed", "relative", "static"],

	//curosr
	"curosr":["none", "copy", "auto", "crosshair", "default", "pointer", "move", "vertical-text", "cell", "context-menu", "alias", "progress", "no-drop", "not-allowed", "-webkit-zoom-in", "-webkit-zoom-out", "e-resize", "ne-resize", "nw-resize", "n-resize", "se-resize", "sw-resize", "s-resize", "w-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "col-resize", "row-resize", "text", "wait", "help", "all-scroll", "-webkit-grab", "-webkit-grabbing"]


}
