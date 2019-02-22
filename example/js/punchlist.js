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
  // DomParser to create new items from String
  var domParser = new DOMParser();
  // Used for unique id 
  var index = 0;
  // Main container
  var mainContainer;
  // Selector for Punch List Container for futures uses 
  var punchListContainerId = 'punchlist-items';
  // Selector for Punch List Item Container used to find the action ancestor
  var punchListItemContainer = 'punchlist-item-container';
  // Selector for Punch List Item Commet used to find the action ancestor
  var punchListItemCommnets = 'punchlist-comments';  
  // Templates used on Punch List
  var templates = {
    // Template of the container 
    punchListContainerTemplate: ({ title }) => `<div class="punchlist-title">
      <h1><i class="fa fa-check"></i>${title}</h1>
      </div>
      <div id="punchlist-items-container">
      <div id="${punchListContainerId}">          
      </div>
      <div id="punchlist-item-action-add" data-action="punchlist-item-action-add">
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
        <div class="punchlist-comment-tag">${(comment.tags) ? comment.tags.map(templates.punchListCommentTagsTemplate).join(' - ') : ''}${comment.deletable ? '<i class="fa fa-times-circle punchlist-item-comment-action-remove" data-action="punchlist-item-comment-action-remove"></i>':''}</div>
    </div>`,
    // Template of the tags in the item 
    punchListItemTagsTemplate: (tag) =>  `<div class="punchlist-item-tag"><b>${tag.name}</b>: ${tag.value}</div>`,
    // Template of the item of the punch list
    punchListItemTemplate: (item, index) =>  `<div class="${punchListItemContainer}" id="item-${index}" data-item='{${(item.data)?item.data.map(templates.punchListDataTemplate).join(','):''}}'>
      <div class="punchlist-item">
        <div class="punchlist-item-label">
          <input type="checkbox" id="punch-item-${index}" ${item.checked ? 'checked': ''} data-action="punchlist-item-action-checked"/>
          <label for="punch-item-${index}" class="punchlist-item-label-text">
            <i class="fa fa-check"></i> 
            <span class="punchlist-item-label-text-line">
              <span class="punchlist-item-label-text-data">${item.task}</span>
            </span>
          </label>
        </div>
        <div class="punchlist-item-action" title="comments" data-action="punchlist-item-action-comment">
          <i class="fa fa-comment punchlist-item-action-comment" data-action="punchlist-item-action-comment"></i>
        </div>
        <div class="punchlist-item-action" title="remove" data-action="punchlist-item-action-remove">
          <i class="fa fa-times-circle punchlist-item-action-remove" data-action="punchlist-item-action-remove"></i>
        </div>
      </div>
      <div class="punchlist-item-tags">
        ${(item.tags)?item.tags.map(templates.punchListItemTagsTemplate).join(''):''}
      </div>
      <div class="${punchListItemCommnets} hidden">
         ${(item.comments) ? item.comments.map(templates.punchListCommentTemplate).join(''):''}
      </div>
      <div class="punchlist-item-comment-action-add" data-action="punchlist-item-comment-action-add">
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
            newData.value = item[dataTransformData.field];
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
  /**
	 * Function to standarize tag
	 * @private
   */
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
  /**
	 * Function that toggle comments for a specific item
	 * @private
   * @param {HtmlElemet} HtmlElement that is the target of the click   
   */
  var toggleComments = function(item) {
    var punchItem = item.closest('.' + punchListItemContainer);
    var comments = punchItem.querySelector('.' + punchListItemCommnets);
    comments.classList.toggle('hidden');
  };    
  /**
	 * Function that remove specific item
	 * @private
   * @param {HtmlElemet} HtmlElement that is the target of the click     
   */
  var removeItem = function(item) {
    var punchItem = item.closest('.' + punchListItemContainer);
    if(settings.removeItemHandler) {
        if(settings.removeItemHandler(punchItem.getAttribute('id'), JSON.parse(punchItem.getAttribute('data-item')))) {
          punchItem.remove();
        } else {
          console.warn("[PunchList][setItemFunctionality]Item could not be removed - check handler removeItemHandler");
        }
    } else {
      punchItem.remove();
    }    
  };   
  /**
	 * Function that remove specific item
	 * @private
   * @param {HtmlElemet} HtmlElement that is the target of the click     
   */
  var checkItem = function(item) {
    if(settings.checkedItemHandler) {
      var punchItem = item.closest('.' + punchListItemContainer);
      if(!settings.checkedItemHandler(punchItem.getAttribute('id'), JSON.parse(punchItem.getAttribute('data-item')), item.checked)) {
        console.warn("[PunchList][setItemFunctionality] Item could not change state - check handler checkedItemHandler");
        item.checked = !item.checked;
      }
    }
  };   
  /**
	 * Add new item to the list
	 * @private
   */
  var addNewItem = function() {
    index++;
    var punchlist_items = mainContainer.querySelector('#' + punchListContainerId);
    var cleanItem = {[index]:{task:'',comments:[], tags:[], data:[]}};
    var new_item_html_string = Utils.map(cleanItem, templates.punchListItemTemplate).join('');
    punchlist_items.innerHTML = punchlist_items.innerHTML + new_item_html_string;
    var createdItem = punchlist_items.querySelector('#item-' + index);
    var toAppendInput = createdItem.querySelector('.punchlist-item-label-text-data');
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'punch-item';
    input.style.width = "100%";
    input.addEventListener('blur', addEventHandler, false);
    toAppendInput.append(input);    
    input.focus();
  };
  /**
	 * Add new item to the list
	 * @private
   */  
  var addNewItemAction = function(item) {
    console.log(item);
    var punchItem = item.closest('.' + punchListItemContainer);
    var newTask = item.value;
    if (newTask.length > 0) {
      if(settings.addItemHandler&&!settings.addItemHandler(punchItem.getAttribute('id'), newTask)) {
        console.warn("[PunchList][addNewItemAction] Item could not be added - check handler addItemHandler");
        punchItem.remove();
      } else {
        item.parentNode.innerHTML = newTask;
      }
    } else {
      punchItem.remove();
    }    
  };    
  /**
	 * Add new comment to an item
	 * @private
   */
  var addNewItemComment = function(item) {
    var comments = item.previousElementSibling;
    console.log(comments);
    var newComment = {comment:'', deletable:true, tags:[]};
    var now = (new Date()).toLocaleString();
    newComment.tags.push({name:'User',value:'Me'});
    newComment.tags.push({name:'Date',value:now});
    var new_comment_html = Utils.map([newComment],templates.punchListCommentTemplate).join('');  
    comments.innerHTML = new_comment_html + comments.innerHTML;
    var newCommentDOM = comments.querySelector('.punchlist-comment');
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'punch-item-comment';
    input.style.width = "100%";
    var toAppendInput = newCommentDOM.querySelector('.punchlist-comment-text');
    toAppendInput.append(input);
    input.addEventListener('blur', addEventHandler, false);
    input.focus();
  };  
  /**
	 * Add new item comment to the list
	 * @private
   */  
  var addNewItemCommentAction = function(item) {
    var punchItemComment = item.closest('.punchlist-comment');
    var newTaskComment = item.value;
    if (newTaskComment.length > 0) {
      item.parentNode.innerHTML = newTaskComment;
    } else {
      punchItemComment.remove();
    }    
  };
  /**
	 * Function that remove specific item comment
	 * @private
   * @param {HtmlElemet} HtmlElement that is the target of the click     
   */
  var removeItemComment = function(item) {
    var punchItemComment = item.closest('.punchlist-comment');
    punchItemComment.remove();
  };     
  //
  // Events
  //
	/**
	 * Handle Click Events
	 * @private
	 */
	var clickEventHandler = function (event) {
    var action = event.target.getAttribute("data-action");
    switch(action) {
      case 'punchlist-item-action-checked':
        checkItem(event.target);
        break;
      case 'punchlist-item-action-comment':
        toggleComments(event.target);
        break;
      case 'punchlist-item-action-remove':
        removeItem(event.target);
        break;
      case 'punchlist-item-action-add':
        addNewItem();
        break;
      case 'punchlist-item-comment-action-add':
        addNewItemComment(event.target);
        break;
      case 'punchlist-item-comment-action-remove':
        removeItemComment(event.target);
        break;        
    }
	};  
	/**
	 * Blur Events
	 * @private
	 */
	var addEventHandler = function (event) {
    var id = event.target.getAttribute("id");
    switch(id) {
      case 'punch-item':
        addNewItemAction(event.target);
        break;
      case 'punch-item-comment':
        addNewItemCommentAction(event.target);
        break;         
    }
	};   
	/**
	 * Handle Key Press Events
	 * @private
	 */
	var keyPressEventHandler = function (event) {
    var key = event.which || event.keyCode;
    if (key === 13) { // 13 is enter
      var id = event.target.getAttribute("id");
      switch(id) {
        case 'punch-item':
          // Remove Listener to avoid problem with no existing object
          event.target.removeEventListener('blur', addEventHandler, false);
          addNewItemAction(event.target);
          break;
        case 'punch-item-comment':
          // Remove Listener to avoid problem with no existing object
          event.target.removeEventListener('blur', addEventHandler, false);
          addNewItemCommentAction(event.target);
          break;          
      }    
    }
	};
	//
	// Public APIs
	//
  /**
	 * Destroy the current initialization.
	 * @public
	 */
  punchList.destroy = function () {
    // If plugin isn't already initialized, stop
    if ( !settings ) return;
    // Remove init class for conditional CSS
    //document.documentElement.classList.remove( settings.initClass );
    // @todo Undo any other init functions...
    // Remove event listeners
    mainContainer.removeEventListener('click', clickEventHandler, false);
    mainContainer.removeEventListener('keypress', keyPressEventHandler, false);
    // Reset variables
    settings = null;
	};
  /**
	 * Initialize Plugin
	 * @public
	 * @param {Object} options User settings
	 */
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
      // Cache of the main container element
      mainContainer = elem;
      // Creates the main container
      createPunchListContainer(mainContainer);
      // Set the events handler 
      mainContainer.addEventListener('click', clickEventHandler, false);
      mainContainer.addEventListener('keypress', keyPressEventHandler, false);
      // Populate the punch list
      populatePunchList();
    } else {
      console.error("[PunchList][init] Main container not found. Selector: '" + settings.container + "'");
      punchList.destroy();
    } 
  };
  /**
	 * Draw a list of tasks provided using defined templates functions. 
	 * @public
   * @param {Array} Array of PunchList objects to be draw    
   *   PunchList Expected schema:
   *   task    : Field for the task description. 
   *   checked : boolean indicating if the task is done or not.
   *   data    : An array of KeyValuePair. This information will be added
   *             as data inside the task items and will be sent when the   
   *             task is deleted or it state is changed.
   *   tags    : An array of KeyValuePair. This information will be shown
   *             under the task to provide more context of the task.
   *   comments: An array of comments that will be shown under the task.
   *             Expected comment schema:
   *               comment   : String with the comment.
   *               deletable : boolean declaring if the comment can be 
   *                           deleted.
   *               tags      : An array of KeyValuePair. This information 
   *                           will be shown under the task to provide more 
   *                           context of the task.
   *                           
   * Example:
   * 
   * var tasks = [ {
   *     task:"Task Description",
   *     checked:false,
   *     data: [ {
   *       name: 'id',
   *       value: 'TaskUniqueIDonOthePlatform',
   *       },
   *       ...
   *     ],
   *     tags: [ {
   *       name: 'User',
   *       value: 'Boss',
   *       },
   *       {
   *       name: 'Date',
   *       value: 'Yesterday',
   *       },
   *       ...
   *     ],        
   *     comments: [ {
   *       comment: 'This is my comment',
   *       deletable: false,
   *       tags: [ {
   *       name: 'User',
   *       value: 'Boss',
   *       },
   *       {
   *       name: 'Date',
   *       value: 'Yesterday',
   *       },
   *       ...
   *       ] },
   *     ...
   *     ] ,
   *     ...
   *   },
   *   ...
   *   ];
	 */
  punchList.drawItems = function (tasks) {
    var htmlPunchListContainer = tasks.map(templates.punchListItemTemplate).join('');
    var punchListContainer = mainContainer.querySelector('#'+punchListContainerId);
    punchListContainer.innerHTML = htmlPunchListContainer;
  };

	return punchList;

});