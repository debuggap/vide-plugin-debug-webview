//get css property
function CalculateCss() {

	//split the css text and get the contributing css
	function splitCSS(input){
		// Separate input by commas
		var match = input.match(/[a-zA-Z0-9_-]+\,[a-zA-Z0-9_-]+/);
		if( match ){
			match = match[0];
			var pre = input.replace(match,'');
			selectors = match.split(',');
			for( var i=0;i<selectors.length;i++){
				selectors[i] = pre+selectors[i];
			}
		}else{
			selectors = input.split(',');
		}
		return selectors;
	}

	function getClassProperty(a){
		var sheets = document.styleSheets, o = [];
		a.matches = a.matches || a.webkitMatchesSelector || a.mozMatchesSelector || a.msMatchesSelector || a.oMatchesSelector;
		for (var i in sheets) {
			var rules = sheets[i].rules || sheets[i].cssRules;
			var href = sheets[i].href;
			for (var r in rules) {
				try{
					if (a.matches(rules[r].selectorText)) {
						var arr = splitCSS(rules[r].selectorText),objValue=rules[r].selectorText;
						for( var i=0;i<arr.length;i++){
							if( a.matches(arr[i]) ){
								objValue=arr[i];
								break;
							}
						}
						o.push({href:href,css:rules[r].cssText,selectors:rules[r].selectorText,selector:objValue});
					}
				}catch(e){}
			}
		}

		return o;
	}

	function getStyleProperty(a){
		var v = a.getAttribute('style');
		return  v ? v :'';
	}

	this.get = function(a){
		return {
			_class:getClassProperty(a),
			_style:getStyleProperty(a)
		}
	}

	this.sort = function(_class){
		for( var i=0;i<_class.length;i++){
			var obj = calculateSingle(_class[i].selector);
			_class[i].value = obj.value;
		}
		return _class.sort(function(a,b){ return b.value-a.value >=0 ? 1 : 0;});
	}

	// Calculate the specificity for a selector by dividing it into simple selectors and counting them
	var calculateSingle = function(input) {
		var selector = input,
			findMatch,
			typeCount = {
				'a': 0,
				'b': 0,
				'c': 0
			},
			parts = [],
			// The following regular expressions assume that selectors matching the preceding regular expressions have been removed
			attributeRegex = /(\[[^\]]+\])/g,
			idRegex = /(#[^\s\+>~\.\[:]+)/g,
			classRegex = /(\.[^\s\+>~\.\[:]+)/g,
			pseudoElementRegex = /(::[^\s\+>~\.\[:]+|:first-line|:first-letter|:before|:after)/gi,
			// A regex for pseudo classes with brackets - :nth-child(), :nth-last-child(), :nth-of-type(), :nth-last-type(), :lang()
			pseudoClassWithBracketsRegex = /(:[\w-]+\([^\)]*\))/gi,
			// A regex for other pseudo classes, which don't have brackets
			pseudoClassRegex = /(:[^\s\+>~\.\[:]+)/g,
			elementRegex = /([^\s\+>~\.\[:]+)/g;

		// Find matches for a regular expression in a string and push their details to parts
		// Type is "a" for IDs, "b" for classes, attributes and pseudo-classes and "c" for elements and pseudo-elements
		findMatch = function(regex, type) {
			var matches, i, len, match, index, length;
			if (regex.test(selector)) {
				matches = selector.match(regex);
				for (i = 0, len = matches.length; i < len; i += 1) {
					typeCount[type] += 1;
					match = matches[i];
					index = selector.indexOf(match);
					length = match.length;
					parts.push({
						selector: match,
						type: type,
						index: index,
						length: length
					});
					// Replace this simple selector with whitespace so it won't be counted in further simple selectors
					selector = selector.replace(match, Array(length + 1).join(' '));
				}
			}
		};

		// Remove the negation psuedo-class (:not) but leave its argument because specificity is calculated on its argument
		(function() {
			var regex = /:not\(([^\)]*)\)/g;
			if (regex.test(selector)) {
				selector = selector.replace(regex, '     $1 ');
			}
		}());

		// Remove anything after a left brace in case a user has pasted in a rule, not just a selector
		(function() {
			var regex = /{[^]*/gm,
				matches, i, len, match;
			if (regex.test(selector)) {
				matches = selector.match(regex);
				for (i = 0, len = matches.length; i < len; i += 1) {
					match = matches[i];
					selector = selector.replace(match, Array(match.length + 1).join(' '));
				}
			}
		}());

		// Add attribute selectors to parts collection (type b)
		findMatch(attributeRegex, 'b');

		// Add ID selectors to parts collection (type a)
		findMatch(idRegex, 'a');

		// Add class selectors to parts collection (type b)
		findMatch(classRegex, 'b');

		// Add pseudo-element selectors to parts collection (type c)
		findMatch(pseudoElementRegex, 'c');

		// Add pseudo-class selectors to parts collection (type b)
		findMatch(pseudoClassWithBracketsRegex, 'b');
		findMatch(pseudoClassRegex, 'b');

		// Remove universal selector and separator characters
		selector = selector.replace(/[\*\s\+>~]/g, ' ');

		// Remove any stray dots or hashes which aren't attached to words
		// These may be present if the user is live-editing this selector
		selector = selector.replace(/[#\.]/g, ' ');

		// The only things left should be element selectors (type c)
		findMatch(elementRegex, 'c');

		// Order the parts in the order they appear in the original selector
		// This is neater for external apps to deal with
		parts.sort(function(a, b) {
			return a.index - b.index;
		});

		var specificity = '0,' + typeCount.a.toString() + ',' + typeCount.b.toString() + ',' + typeCount.c.toString();
		var rt = {
			selector: input,
			value: parseInt(specificity.replace(/,/g,'').replace(/^0+/,''))
			//specificity: specificity,
			//parts: parts
		};
		return rt;
	}
};