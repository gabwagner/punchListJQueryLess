// DOM Ready 
// From https://code.google.com/archive/p/domready/
;(function(){

    var DomReady = window.DomReady = {};

	// Everything that has to do with properly supporting our document ready event. Brought over from the most awesome jQuery. 

    var userAgent = navigator.userAgent.toLowerCase();

    // Figure out what browser is being used
    var browser = {
    	version: (userAgent.match( /.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/ ) || [])[1],
    	safari: /webkit/.test(userAgent),
    	opera: /opera/.test(userAgent),
    	msie: (/msie/.test(userAgent)) && (!/opera/.test( userAgent )),
    	mozilla: (/mozilla/.test(userAgent)) && (!/(compatible|webkit)/.test(userAgent))
    };    

	var readyBound = false;	
	var isReady = false;
	var readyList = [];

	// Handle when the DOM is ready
	function domReady() {
		// Make sure that the DOM is not already loaded
		if(!isReady) {
			// Remember that the DOM is ready
			isReady = true;
        
	        if(readyList) {
	            for(var fn = 0; fn < readyList.length; fn++) {
	                readyList[fn].call(window, []);
	            }
            
	            readyList = [];
	        }
		}
	};

	// From Simon Willison. A safe way to fire onload w/o screwing up everyone else.
	function addLoadEvent(func) {
	  var oldonload = window.onload;
	  if (typeof window.onload != 'function') {
	    window.onload = func;
	  } else {
	    window.onload = function() {
	      if (oldonload) {
	        oldonload();
	      }
	      func();
	    }
	  }
	};

	// does the heavy work of working through the browsers idiosyncracies (let's call them that) to hook onload.
	function bindReady() {
		if(readyBound) {
		    return;
	    }
	
		readyBound = true;

		// Mozilla, Opera (see further below for it) and webkit nightlies currently support this event
		if (document.addEventListener && !browser.opera) {
			// Use the handy event callback
			document.addEventListener("DOMContentLoaded", domReady, false);
		}

		// If IE is used and is not in a frame
		// Continually check to see if the document is ready
		if (browser.msie && window == top) (function(){
			if (isReady) return;
			try {
				// If IE is used, use the trick by Diego Perini
				// http://javascript.nwbox.com/IEContentLoaded/
				document.documentElement.doScroll("left");
			} catch(error) {
				setTimeout(arguments.callee, 0);
				return;
			}
			// and execute any waiting functions
		    domReady();
		})();

		if(browser.opera) {
			document.addEventListener( "DOMContentLoaded", function () {
				if (isReady) return;
				for (var i = 0; i < document.styleSheets.length; i++)
					if (document.styleSheets[i].disabled) {
						setTimeout( arguments.callee, 0 );
						return;
					}
				// and execute any waiting functions
	            domReady();
			}, false);
		}

		if(browser.safari) {
		    var numStyles;
			(function(){
				if (isReady) return;
				if (document.readyState != "loaded" && document.readyState != "complete") {
					setTimeout( arguments.callee, 0 );
					return;
				}
				if (numStyles === undefined) {
	                var links = document.getElementsByTagName("link");
	                for (var i=0; i < links.length; i++) {
	                	if(links[i].getAttribute('rel') == 'stylesheet') {
	                	    numStyles++;
	                	}
	                }
	                var styles = document.getElementsByTagName("style");
	                numStyles += styles.length;
				}
				if (document.styleSheets.length != numStyles) {
					setTimeout( arguments.callee, 0 );
					return;
				}
			
				// and execute any waiting functions
				domReady();
			})();
		}

		// A fallback to window.onload, that will always work
	    addLoadEvent(domReady);
	};

	// This is the public function that people can use to hook up ready.
	DomReady.ready = function(fn, args) {
		// Attach the listeners
		bindReady();
    
		// If the DOM is already ready
		if (isReady) {
			// Execute the function immediately
			fn.call(window, []);
	    } else {
			// Add the function to the wait list
	        readyList.push( function() { return fn.call(window, []); } );
	    }
	};
    
	bindReady();
	
})();

// Utils functions
var Utils = window.Utils = (function(){

return {
  
  // Map function to replace $.map
  map: function(object, callback) {
    var result;
    // If the object is an array it will call directly to the map function
    if(Array.isArray(object)) {
      result = object.map(callback);
    } else if(typeof object === 'object' && object) {
      // If it's an object it will take the first property as index 
      // and the content as the object to map
      result = [];
      for(var index in object) {
        result.push(callback(object[index], index, object));
      }
    }
    return result;
  },
  // Map function to replace $.map
  mapWithIndex: function(index, object, callback) {
    var result;
    // If the object is an array it will call directly to the map function
    if(typeof object === 'object' && object) {
      // If it's an object it will take the first property as index 
      // and the content as the object to map
      result = [];
      result.push(callback(object, index, object));
    }
    return result;
  },  
  // Extend function to replace $.extend
  extend: function () {

    // Variables
    var extended = {};
    var deep = false;
    var i = 0;
    var length = arguments.length;

    // Check if a deep merge
    if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
      deep = arguments[0];
      i++;
    }

    // Merge the object into the extended object
    var merge = function (obj) {
      for ( var prop in obj ) {
        if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
          // If deep merge and property is an object, merge properties
          if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
            extended[prop] = extend( true, extended[prop], obj[prop] );
          } else {
            extended[prop] = obj[prop];
          }
        }
      }
    };

    // Loop through each object and conduct a merge
    for ( ; i < length; i++ ) {
      var obj = arguments[i];
      merge(obj);
    }

    return extended;

  },
  // Extend function to replace $.extend
  apiCall: function (method, url, data, callBack, errorCallBack, token) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', 'Bearer ' + token);    
    headers.append("Accept","application/json, text-plain, */*");
    headers.append("X-Requested-With","XMLHttpRequest");

    var status;
    var isOk;
    
    var fetchOptions = {
      method: method, 
      mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit  
      headers: headers, 
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
    };
    
    if(method!="GET"&&data) {
      fetchOptions.body =JSON.stringify(data);
    }
    
    return fetch(url, fetchOptions)
    .then(response =>  {
      status = response.status;
      isOk = response.ok;
      return response.json();
    })
    .then(responseJson => {
      if(isOk) {
        callBack(responseJson);
      } else { 
        var error = new Error('Punch List Error');
        error.code = status;
        error.json = responseJson;
        throw error;
      }
    })  
    .catch( error => {
      if(error.json) {
        information = error.json;
        errorCallBack(information);        
      } else {
        throw error;
      }
    });
    
    
  }, 
}
}());

