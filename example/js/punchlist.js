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
  // USer id Temporal for testing porpouse
  var projectId;  
  // DomParser to create new items from String
  var domParser = new DOMParser();
  // disable the application while executing calls
  var disabled = false;
  // Main container cache
  var mainContainer;
  // Item List container cache
  var punchListItems;
  // Working cache 
  var working;
  
  const newIdItem = 'new';

  const selectorsIds = {
      punchListItems:'punch-items',
      punchListItem: 'punch-item-',
      punchListItemText: 'punch-item-text-',
      punchListComments:'punch-comments-',
      punchListComment: 'punch-comment-',
      punchListCommentText: 'punch-comment-text-',
      punchListProjects: 'punch-projects',
      punchListWorking: 'punch-working',
  };
  
  // Templates used on Punch List
  const templates = {
    punchListLoading : `<div class="punchlist-loader"></div>`,
    punchlistProjectTemplate : ({ id, name }) => `<option value="${id}">${name}</option>`,
    // Template of the container 
    punchListContainerTemplate: ({ title, projects }) => `<div id="${selectorsIds.punchListWorking}" class="punchlist-working hidden"></div><div class="punchlist-title">
    <h1><i class="fa fa-check"></i>${title}</h1>
    </div>
    <div class="punchlist-projects"> Project: 
    <select id="${selectorsIds.punchListProjects}">
      ${(projects) ? projects.map(templates.punchlistProjectTemplate).join('') : '<option value="-1">No Projects</option>'}
    </select>
    </div>        
    <div class="punchlist-items-container">
    <div id="${selectorsIds.punchListItems}" class="punchlist-items"></div>
    <div class="punchlist-item-action-add" data-action="punchlist-item-action-add">
      <i class="fa fa-plus"></i>
      Add an Item
    </div>        
    </div>`,       
    // Template of the tags in the comment 
    punchListCommentTagsTemplate: (tag) =>  `<b>${tag.name}</b>: ${tag.value}`,
    // Template of the comments 
    punchListCommentTemplate: (comment) =>  `<div class="punchlist-comment" id="${ selectorsIds.punchListComment + comment.id}" data-id="${comment.id}">
    <div class="punchlist-comment-text" id="${selectorsIds.punchListCommentText + comment.id}">${comment.comment}</div>
    <div class="punchlist-comment-tag">${(comment.tags) ? comment.tags.map(templates.punchListCommentTagsTemplate).join(' - ') : ''}${comment.deletable ? '<i class="fa fa-times-circle punchlist-item-comment-action-remove" data-action="punchlist-item-comment-action-remove" data-id="' + comment.id + '"></i>':''}</div>
    </div>`,
    // Template of the tags in the item 
    punchListItemTagsTemplate: (tag) =>  `<div class="punchlist-item-tag"><b>${tag.name}</b>: ${tag.value}</div>`,
    // Template of the item of the punch list
    punchListItemTemplate: (item) =>  `<div class="punchlist-item-container" id="${ selectorsIds.punchListItem + item.id}" data-id="${item.id}">
    <div class="punchlist-item">
    <div class="punchlist-item-label">
    <input type="checkbox" id="check-punch-item-${item.id}" ${item.punched ? 'checked': ''} data-id="${item.id}" data-action="punchlist-item-action-checked"/>
    <label for="check-punch-item-${item.id}" class="punchlist-item-label-text">
    <i class="fa fa-check"></i> 
    <span class="punchlist-item-label-text-line">
    <span class="punchlist-item-label-text-data" id="${selectorsIds.punchListItemText +item.id}">${item.task}</span>
    </span>
    </label>
    </div>
    <div class="punchlist-item-action" title="comments" data-action="punchlist-item-action-comment" data-id="${item.id}">
    <i class="fa fa-comment punchlist-item-action-comment" data-action="punchlist-item-action-comment" data-id="${item.id}"></i>
    </div>
    <div class="punchlist-item-action" title="remove" data-action="punchlist-item-action-remove" data-id="${item.id}">
    <i class="fa fa-times-circle punchlist-item-action-remove" data-action="punchlist-item-action-remove" data-id="${item.id}"></i>
    </div>
    </div>
    <div class="punchlist-item-tags">
    ${(item.tags)?item.tags.map(templates.punchListItemTagsTemplate).join(''):''}
    </div>
    <div class="punch-list-comments hidden" id="${selectorsIds.punchListComments + item.id}">
    ${(item.comments) ? item.comments.map(templates.punchListCommentTemplate).join(''):''}
    </div>
    <div class="punchlist-item-comment-action-add" data-id="${item.id}" data-action="punchlist-item-comment-action-add">
    <i class="fa fa-plus"></i>
    Add Comment
    </div>
    </div>`,
  };
  
  // Plugin
  var punchList = window.punchList = {};
  // Feature test
  var supports = !!document.querySelector && !!root.addEventListener;
  // Place Holder Variables
  var settings;  
  // Default settings
  var defaults = {
    // Title of the Punch List 
    title: 'Punch List',
    // Width of the container. If not set, will expand to the size of the parent 
    width: null,
    // RestFULL API CALL to Project. Response must be JSON 
    projectAPICall: null,    
    // RestFULL API CALL to Item. Response must be JSON 
    itemAPICall: null,    
    // RestFULL API CALL to Comment. Response must be JSON 
    commentAPICall: null,
    // List of initial projects
    projects: null,
    // User Id 
    userId: 1,
  };
  //
  // Methods
  //
  var workingStart = function() {
      disabled = true;
      working.classList.remove('hidden');    
  }
  var workingEnd = function() {
      disabled = false;
      working.classList.add('hidden');    
  }
  /**
  * Creates the primary container where the list will be added.
  * Also set the css class for it
  * @private
  * @param {HtmlElemet} Container Element
  */
  var createPunchListContainer = function(elem) {
    elem.classList.add('punchlist-container');
    var htmlPunchListContainer = [{ title: settings.title, projects: settings.projects }].map(templates.punchListContainerTemplate).join('');
    if(settings.width) {
      elem.style.width = settings.width + 'px';
    }
    elem.innerHTML = htmlPunchListContainer;
  };    
  /**
  * Populates punch list with the specified API CALL
  * @private
  */
  var populatePunchList = function() {
    // Will only be called if the fillDataCall is added
    if(settings.projectAPICall) {
      
      var projectsInput = mainContainer.querySelector('#' + selectorsIds.punchListProjects);

      punchListItems.innerHTML = templates.punchListLoading;
      
      projectId = projectsInput.value;
      
      workingStart();
      
      var callBack = function (data) {
        // Standarize data in case that information is not as punch list is expecting
        var standarizeData = standardizeProject(data.items);
        // Draw Tasks into the punchList
        punchList.drawItems(standarizeData);      
        projectsInput.disabled = false;       
        
        workingEnd();
        
      }
      
      var errorCallBack = function (data) {
        console.error(data);
        punchList.drawItems([]);
        
        projectsInput.disabled = false;        
        workingEnd();
        
      }

      Utils.apiCall('GET', settings.projectAPICall + '/' + projectId, null, callBack, errorCallBack, settings.apiToken );
    } 
  };
  /**
  * Transform User Data to Punch List Data
  * @private
  * @param {Array} Array of Objects to be converted    
  */  
  var standardizeProject = function(data) {
    var result = [];
    for(var item of data) {
      result.push(standardizeItem(item));
    }
    return result;
  };
  /**
  * Transform User Data to Punch List Data
  * @private
  * @param {Array} Array of Objects to be converted    
  */  
  var standardizeItem = function(data) {
    var result = {};
    result.id = data.id;
    result.task = data.title;
    result.tags = [{'name':'User','value':data.user.name},{'name':'Company','value':data.user.company},{'name':'Date','value':new Date(data.created_at).toLocaleString()}];
    result.punched = data.punched;
    var comments = [];
    if(data.comments) {
      for(var comment of data.comments) {
        comments.push(standardizeComment(comment));
      }
    }
    result.comments = comments;
    return result;
  };
  /**
  * Transform User Data to Punch List Data
  * @private
  * @param {Array} Array of Objects to be converted    
  */  
  var standardizeComment = function(data) {
    var result = {};
    result.id = data.id;
    result.comment = data.text;
    if(data.user.id==settings.userId) {
      result.deletable = true;
    }
    result.tags = [{'name':'User','value':data.user.name},{'name':'Company','value':data.user.company},{'name':'Date','value':new Date(data.created_at).toLocaleString()}];    
    return result;
  };  
  /**
  * Function the remove an item with animation
  * @private
  * @param {HtmlElemet} HtmlElement that is going to be removed
  */ 
  var animateRemove = function(item) {
    var height = item.offsetHeight;
    var animation = item.animate([
      { height: height + 'px' }, { height:'0px', } ],
      { duration:300 }
    );
    animation.onfinish = function(event) {
      item.remove();
    };
  }    
  /**
  * Function that toggle comments for a specific item
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click   
  */
  var toggleComments = function(item) {
    var id = item.getAttribute("data-id");
    // Search for the comments element
    var comments = punchListItems.querySelector('#' + selectorsIds.punchListComments + id);
    // Toggle css class hidden, that will show all the comments or just the first
    comments.classList.toggle('hidden');
  };    
  /**
  * Function that remove specific item
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click     
  */
  var removeItem = function(item) {
    // Search for parent element
    var id = item.getAttribute("data-id");

    if(settings.itemAPICall) {
      
      workingStart();
      
      var callBack = function(data) {
        workingEnd();
        var punchItem = punchListItems.querySelector('#' + selectorsIds.punchListItem + id);        
        animateRemove(punchItem);
      };
            
      var errorCallBack = function (data) {
        
        console.error(data);      
  	    workingEnd();
  	    
      };

      Utils.apiCall('DELETE', settings.itemAPICall + '/' + id, null, callBack, errorCallBack, settings.apiToken ); 
      
    } else {
      animateRemove(punchItem);
    }    
  };   
  /**
  * Function that check item
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click     
  */
  var checkItem = function(item) {
    // Check if the handler for check is set, if not set it will continue
    var id = item.getAttribute("data-id");

    if(settings.itemAPICall) {    
      
      workingStart();
      
      var callBack = function(data) {
        var task = standardizeItem(data);
        item.checked = task.punched;
        workingEnd();        
      };

      var errorCallBack = function (data) {
        console.error(data);      
        item.checked = !item.checked;
        workingEnd();
      };

      var data = {punched:item.checked};
      
      Utils.apiCall('PUT', settings.itemAPICall + '/' + id, data, callBack, errorCallBack, settings.apiToken );       
    }
  }; 
  
  var createInputText = function (id) {
    var input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.style.width = '100%';    
    return input;
  };
  /**
  * Add new item to the list
  * @private
  */
  var addNewItem = function() {
    
    var cleanItem = [{id:newIdItem,task:'',comments:[], tags:[], data:[]}];
    
    var newItemHtmlString = Utils.map(cleanItem, templates.punchListItemTemplate).join('');
    // Add item at the end of the list
    punchListItems.innerHTML = punchListItems.innerHTML + newItemHtmlString;
    // Search for the new created item
    var createdItem = punchListItems.querySelector('#' + selectorsIds.punchListItem + newIdItem);
    // Search for the element where the input should be added
    var toAppendInput = createdItem.querySelector('#' + selectorsIds.punchListItemText + newIdItem);
    // Create new input
    var input = createInputText('punch-item-text-input');
    // Add the blur event to calll when losing focus
    input.addEventListener('blur', addEventHandler, false);
    //  Add the input to parent element
    toAppendInput.append(input);    
    // Set focus on the input
    input.focus();
  };
  /**
  * Add new item to the list
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click    
  */  
  var addNewItemAction = function(item) {
    
    var punchItemToRemove =  punchListItems.querySelector('#' + selectorsIds.punchListItem + newIdItem);
    var punchListItemsCache = punchListItems;
    var newTask = item.value;
    // Check if the input is not empty. 
    if (newTask.length > 0) {
      // If the addITemHandler is set 
      // Check before with the add handler. If can not create will delete the new item.
      
      if(settings.itemAPICall) {
        
        workingStart();
                
        var callBack = function(data) {
          var task = standardizeItem(data);
          var newItemHmltring = Utils.map([task], templates.punchListItemTemplate).join('');
          // Remove item where input was
          punchItemToRemove.remove();
          // Add new item
          punchListItemsCache.innerHTML = punchListItemsCache.innerHTML + newItemHmltring;
          workingEnd();        
        }

        var errorCallBack = function (data) {
          punchItemToRemove.remove();
          console.error(data);      
          workingEnd();
        }    
        
        var data = {title:newTask,user_id:settings.userId, project_id: projectId, punched:false};

        Utils.apiCall('POST', settings.itemAPICall, data, callBack, errorCallBack, settings.apiToken );       
      } else {
        var item = {id: new Date.getTime(), task:newTask,comments:[], tags:[], data:[]};
        var newItemHmltring = Utils.map(item, templates.punchListItemTemplate).join('');
        removeItem.remove();
        punchListItems.innerHTML = punchlistItems.innerHTML + newItemHmltring;        
      }
    } else {
      punchItemToRemove.remove();
    }    
  };    
  /**
  * Add new comment to an item
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click  
  */
  var addNewItemComment = function(item) {
    var id = item.getAttribute('data-id');
    var comments = punchListItems.querySelector('#'+ selectorsIds.punchListComments + id);
    // Create new comment
    var newComment = {id: newIdItem, comment:'', tags:[]};
    
    var newCommentHtml = Utils.map([newComment],templates.punchListCommentTemplate).join('');
    
    // Insert the comment first
    comments.innerHTML = newCommentHtml + comments.innerHTML;
    
    // Create new input
    var input = createInputText('punch-comment-input-text');   
    input.setAttribute("data-id", id);
    var toAppendInput = comments.querySelector('#' + selectorsIds.punchListCommentText + newIdItem);
    
    toAppendInput.append(input);
    // Add event to use when losing focus
    input.addEventListener('blur', addEventHandler, false);
    // Set focus
    input.focus();
  };  
  /**
  * Add new item comment to the list
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click       
  */  
  var addNewItemCommentAction = function(item) {
    var id = item.getAttribute('data-id');

    var newComment = punchListItems.querySelector('#' + selectorsIds.punchListComment + newIdItem);
    
    var newTaskComment = item.value;
    // Check if the input is not empty. 
    if (newTaskComment.length > 0) {
      if(settings.commentAPICall) {
        workingStart();

        var callBack = function(data) {
          var comment = standardizeComment(data);

          var comments = punchListItems.querySelector('#'+ selectorsIds.punchListComments + id);
          var newCommentHtml = Utils.map([comment], templates.punchListCommentTemplate).join('');
          // Remove item where input was
          newComment.remove();
          // Add new item
          comments.innerHTML = newCommentHtml + comments.innerHTML;
          workingEnd();        
        }
        
        var errorCallBack = function (data) {
          newComment.remove();
          console.error(data);      
          workingEnd();
        }    
        
        var data = {text:newTaskComment,user_id:settings.userId, item_id: id};
        
        Utils.apiCall('POST', settings.commentAPICall, data, callBack, errorCallBack, settings.apiToken );       
      } else {
        item.parentNode.innerHTML = newTaskComment;
      }      
    } else {
      newComment.remove();
    }    
  };
  /**
  * Function that remove specific item comment
  * @private
  * @param {HtmlElemet} HtmlElement that is the target of the click     
  */
  var removeItemComment = function(item) {
    // Search for the item parent
    var id = item.getAttribute('data-id');
    
    var punchItemComment = punchListItems.querySelector('#' + selectorsIds.punchListComment + id);
    
    if(settings.commentAPICall) {
      
      workingStart();

      var callBack = function(data) {
        punchItemComment.remove();
        workingEnd();        
      }

      var errorCallBack = function (data) {
        console.error(data);      
        workingEnd();
      }         
      
      Utils.apiCall('DELETE', settings.commentAPICall + '/' + id, null, callBack, errorCallBack, settings.apiToken );       
    } else {      
      punchItemComment.remove();
    }
  };     
  //
  // Events
  //
  /**
  * Handle Click Events
  * @private
  * @param {Event} Event Trigger         
  */
  var clickEventHandler = function (event) {
    // Get custom data-action to know the origin of the event
    // If not set the event will not trigger anything
    if(!disabled) {
      var action = event.target.getAttribute('data-action');
      switch(action) {
        // When the action came from the check box
        case 'punchlist-item-action-checked':
          checkItem(event.target);
          break;
        //  When the action came from the comment icon
        case 'punchlist-item-action-comment':
          toggleComments(event.target);
          break;
        //  When the action came from the remove icon        
        case 'punchlist-item-action-remove':
          removeItem(event.target);
          break;
        //  When the action came from the add item link        
        case 'punchlist-item-action-add':
          addNewItem();
          break;
        //  When the action came from the add comment link        
        case 'punchlist-item-comment-action-add':
          addNewItemComment(event.target);
          break;
        //  When the action came from the remove comment icon        
        case 'punchlist-item-comment-action-remove':
          removeItemComment(event.target);
          break;        
      }
    }
  };  
  /**
  * Blur Events
  * @private
  * @param {Event} Event Trigger       
  */
  var addEventHandler = function (event) {
    if(!disabled) {
      var id = event.target.getAttribute('id');
      // get the id attribute of the target event. To check is one of the creation inputs   
      switch(id) {
        case 'punch-item-text-input':
          addNewItemAction(event.target);
          break;
        case 'punch-comment-input-text':
          addNewItemCommentAction(event.target);
          break;         
      }
    }
  };   
  /**
  * Selected Events
  * @private
  * @param {Event} Event Trigger       
  */
  var selectEventHandler = function (event) {
    if(!disabled) {
      var id = event.target.getAttribute('id');
      // get the id attribute of the target event. To check is one of the creation inputs   
      switch(id) {
        case 'punch-projects':
          populatePunchList();
          break;
      }
    }
  };    
  /**
  * Handle Key Press Events 
  * If enter is triggered from any of the add inputs it will re-send to the corresponding handler
  * @private
  * @param {Event} Event Trigger     
  */
  var keyPressEventHandler = function (event) {
    var key = event.which || event.keyCode;
    // 13 is enter
    if (key === 13) { 
      // get the id attribute of the target event. To check is one of the creation inputs
      var id = event.target.getAttribute('id');
      switch(id) {
        case 'punch-item-text-input':
          // Remove Listener to avoid problem with none existing object because it will delete de input
          event.target.removeEventListener('blur', addEventHandler, false);
          addNewItemAction(event.target);
        break;
      case 'punch-comment-input-text':
        // Remove Listener to avoid problem with none existing object because it will delete de input
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
    mainContainer.removeEventListener('change', selectEventHandler, true); 
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
      // Cache Item List 
      punchListItems = mainContainer.querySelector('#' + selectorsIds.punchListItems );
      // Set the events handler 
      mainContainer.addEventListener('click', clickEventHandler, false);
      mainContainer.addEventListener('keypress', keyPressEventHandler, false);
      mainContainer.addEventListener('change', selectEventHandler, true); 
      working = mainContainer.querySelector('#'+ selectorsIds.punchListWorking);
      // Populate the punch list
      populatePunchList();
    } else {
      console.error('[PunchList][init] Main container not found. Selector: "' + settings.container + '"');
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
  *     task:'Task Description',
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
    if(tasks.length>0) {
      var itemsToShow = tasks.map(templates.punchListItemTemplate).join('');
      punchListItems.innerHTML = itemsToShow;
    } else {
      punchListItems.innerHTML = "No Items Found";
    }
  };

  return punchList;
});