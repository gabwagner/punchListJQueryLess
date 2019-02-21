;(function (root, factory) {
	if ( typeof define === 'function' && define.amd ) {
		define(factory(root));
	} else if ( typeof exports === 'object' ) {
		module.exports = factory();
	} else {
		root.punchList = factory(root);
	}
})(typeof global !== 'undefined' ? global : this.window || this.global, function (root) {
  // More strict in JS implementation. Fail Fast
  'use strict';
  // Used for unique id 
  var index = 0;
  // Templates used on Punch List
  var templates = {
    // Template of the container 
    punchListContainerTemplate: ({ title }) => `<div class="punchlist-title">
      <h1><i class="fa fa-check"></i>${title}</h1>
      </div>
      <div id="punchlist-items-container">
      <div id="punchlist-items">          
      </div>
      <div id="punchlist-item-action-add">
        <i class="fa fa-plus"></i>
        Add an Item
      </div>        
    </div>`,    
    // Template for the data that will be added in each item 
    punchListDataTemplate: (data) =>  `"${data.name}":"${data.value}"`,      
    // Template of the tags in the comment 
    punchListCommentTagsTemplate: (tag) =>  `<b>${tag.name}</b>: ${tag.value}`,
    // Template of the comments 
    punchListCommentTemplate: (comment) =>  `<div class="punchlist-comment">
        <div class="punchlist-comment-text">${comment.comment}</div>
        <div class="punchlist-comment-tag">${(comment.tags) ? comment.tags.map(PunchList.defaults.punchListCommentTagsTemplate).join(' - ') : ''}${comment.deletable ? '<i class="fa fa-times-circle punchlist-item-comment-action-remove"></i>':''}</div>
    </div>`,
    // Template of the tags in the item 
    punchListItemTagsTemplate: (tag) =>  `<div class="punchlist-item-tag"><b>${tag.name}</b>: ${tag.value}</div>`,
    // Template of the item of the punch list
    punchListItemTemplate: (item, index) =>  `<div id="item-${index}" data-item='{${(item.data)?item.data.map(PunchList.defaults.punchListDataTemplate).join(','):''}}'>
      <div class="punchlist-item">
        <div class="punchlist-item-label">
          <input type="checkbox" id="punch-item-${index}" ${item.checked ? 'checked': ''}/>
          <label for="punch-item-${index}" class="punchlist-item-label-text">
            <i class="fa fa-check"></i> 
            <span class="punchlist-item-label-text-line">
              <span class="punchlist-item-label-text-data">${item.task}</span>
            </span>
          </label>
        </div>
        <div class="punchlist-item-action" title="comments">
          <i class="fa fa-comment punchlist-item-action-comment"></i>
        </div>
        <div class="punchlist-item-action" title="remove">
          <i class="fa fa-times-circle punchlist-item-action-remove"></i>
        </div>
      </div>
      <div class="punchlist-item-tags">
        ${(item.tags)?item.tags.map(PunchList.defaults.punchListItemTagsTemplate).join(''):''}
      </div>
      <div class="punchlist-comments hidden">
         ${(item.comments) ? item.comments.map(PunchList.defaults.punchListCommentTemplate).join(''):''}
      </div>
      <div class="punchlist-item-comment-action-add">
        <i class="fa fa-plus"></i>
        Add Comment
      </div>
    </div>`,
  };
  // Plugin
  var punchList = {};
  // Feature test
  var supports = !!document.querySelector && !!root.addEventListener;
  // Place Holder Variables
  var settings;  
  // Default settings
  var defaults = {
    // Title of the Punch List 
    title: "Punch List",
    // Width of the container. If not set, will expand to the size of the parent 
    width: null,
    // RestFULL API CALL. Response must be JSON 
    fillDataCall: null,
    // JSON mapping to convert to standarize items 
    fillDataTransform: null,
    // Handler to be called one a item is added 
    //    addItemHandler(itemId, val)  
    //      itemId: is the unique id that can be used to return the dom of the object 
    //      val: is the task value the new item will have 
    addItemHandler: null,
    // Handler to be called when an item is removed 
    //  removeItemHandler(itemId, itemData)
    //    itemId: is the unique id that can be used to return the dom of the object 
    //    itemData: is the 'item' data $(#itemId).data('item')
    removeItemHandler: null,
    // Handler to be called when an item change is status 
    //  removeItemHandler(itemId, itemData, checked)
    //    itemId: is the unique id that can be used to return the dom of the object 
    //    itemData: is the 'item' data $(#itemId).data('item')
    //    checked: boolean. It tells if the item has been checked or unchecked    
    checkedItemHandler: null,
    // If set on false will not validate the JSON schema
    // If JSON is invalid the items will not be added in the list
    validateJSON: true,
  };
	//
	// Methods
	//
	/**
	 * Creates the primary container where the list will be added.
   * Also set the css class for it
	 * @private
   * @param {HtmlElemet} Container Element
	 */
  var createPunchListContainer = function(elem) {
    elem.classList.add('punchlist-container');
    var htmlPunchListContainer = [{title: settings.title}].map(templates.punchListContainerTemplate).join('');
    if(settings.width) {
      elem.style.width = settings.width +"px";
    }
    elem.innerHTML = htmlPunchListContainer;
  }    
	/**
	 * Populates punch list with the specified API CALL
	 * @private
	 */
  var populatePunchList = function() {
    // Will only be called if the fillDataCall is added
    if(settings.fillDataCall) {
      fetch(settings.fillDataCall)
        .then(function(response) {
          return response.json();
        })
        .then(function(jsonResponse) {
          index = jsonResponse.length;
          // Standarize data in case that information is not as punch list is expecting
          var standarizeData = standardizeData(jsonResponse);
          // Draw Tasks into the punchList
          punchList.drawItems(standarizeData);          
        })
        .catch(error => console.error("{PunchList][populatePunchList] Error while retrieving data. Status:'" + error + "'"));   
    } 
  };
	/**
	 * Transform User Data to Punch List Data
	 * @private
   * @param {Array} Array of Objects to be converted
   *
   * Transform JSON-Object:
   * settings.fillDataTransform Expected Schema:
   *   task      : This is the userdata property where is the description of the task.
   *   checked   : This is the userdata property where is a boolean value that inform if the task is complete or not.
   *              If not set all task will be in not complete state.
   *   data      : This is an array of key value pair of field. This data will be added in each task item that is added.
   *               This information is send when the task is deteled or change it's complete state.
   *               This property is not required.
   *               KeyValue Pair Properties:
   *                 name  ->  The key property that will be added in data.
   *                 field ->  The property field in the userdata that will be use as value.
   *   tags      : This is an array of key value pair of field. This data will be shown under the task name to add extra 
   *               information that could be need.
   *               This property is not required.
   *               KeyValue Pair Properties:
   *                 name    ->  The key property that will be added in data.
   *                 field   ->  The property field in the userdata that will be use as value.
   *                 convert ->  Conver the value in case that need. Current there is a unique "date".
   *                             "date": Convert from String to Date and return localeString of it.
   *   comments  : This is an object property. It will contain comments of the task that are inside of the userdata.
   *               This property is not required.
   *               Object Properties:
   *                 listField : Property in userdata where the Arrays of Comments are. 
   *                 field     : The property inside the array where the proper comment is.
   *                 deletable : Property informing if the comments in userdata can be deleted.
   *                 tags      : See tags.
   * 
   * Example:
   * 
   *   var jsonTransform = {
   *     data: [
   *     {
   *       field: "id",
   *       name: "id"
   *     }],
   *     task: "item",
   *     checked: "index",
   *     tags: [ 
   *       { 
   *         field:"project",
   *         name:"Project",
   *         convert: null,
   *       }, 
   *       {
   *         field:"datetime",
   *         name:"Date",
   *         convert: "date", 
   *       }
   *     ],
   *     comments: { 
   *       listField: "comments", 
   *       field:"comment",
   *       deletable: false,
   *       tags: [
   *         {
   *           field: "user",
   *           name: "User",
   *           convert: null,
   *         }
   *       ]
   *     }
   *   }    
	 */  
  var standardizeData = function(data) {
    var result = [];
    if(settings.fillDataTransform) {
      var transform = settings.fillDataTransform;
      for(var item of data) {
        var newItem = {};
        newItem.task = item[transform.task];
        newItem.checked =  item[transform.checked];
        newItem.comments = [];
        newItem.tags = [];
        newItem.data = [];
        // If data is defined get data information
        if(transform.data) {
          for(var dataTransformData of transform.data) {
            var newData = {};
            newData.name = dataTransformData.name;
            newData.value = item[data.dataTransformData];
            newItem.data.push(newData);
          }
        }
        // If tags are defined get tags information
        if(transform.tags) {
          for(var dataTransformTag of transform.tags) {
            var newTag = standardizeTag(item, dataTransformTag);
            newItem.tags.push(newTag);
          }
        }
        // If comments are defined get comments information
        if(transform.comments) {
          for( var comment of item[transform.comments.listField]) {
            var newComment = {};
            newComment.comment = comment[transform.comments.field];
            newComment.deletable = transform.comments.deletable;
            newComment.tags = [];
            // If comment tags are defined get comment tags information
            if(transform.comments.tags) {
              for(var tag of transform.comments.tags) {
                var newTag = standardizeTag(comment, tag);
                newComment.tags.push(newTag);
              }                
            }
            newItem.comments.push(newComment);
          }
        }
        result.push(newItem);
      }
    } else {
      result = data;
    }  
    return result;
  };
  // Function to standarize tag
  var standardizeTag = function(item, tag) {
    var newTag = {};
    newTag.name = tag.name;
    switch(tag.convert) {
      case "date":
        newTag.value = new Date(item[tag.field]).toLocaleString();
        break;
      default:
        newTag.value = item[tag.field];
        break;
    } 
    return newTag;   
  };  
 
	//
	// Public APIs
	//
  punchList.destroy = function () {
    // If plugin isn't already initialized, stop
    if ( !settings ) return;
    // Remove init class for conditional CSS
    //document.documentElement.classList.remove( settings.initClass );
    // @todo Undo any other init functions...
    // Remove event listeners
    //document.removeEventListener('click', eventHandler, false);
    // Reset variables
    settings = null;
	};
  
  punchList.init = function (options) {
    // feature test
		if ( !supports ) return;
		// Destroy any existing initializations
		punchList.destroy();
    // Initialize Settings
    settings = Utils.extend(defaults,options);
    // Get Primary Container
    let elem = document.querySelector ( settings.container );
    // Create the container of the list
    if(elem) {
      createPunchListContainer(elem);
      // Populate the punch list
      populatePunchList();
    } else {
      console.error("[PunchList][init] Main container not found. Selector: '" + settings.container + "'");
      punchList.destroy();
    } 
  };  
  
  punchList.drawItems = function (data) {
  };

	return punchList;

});