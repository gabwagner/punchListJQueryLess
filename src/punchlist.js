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
  // Modal Cache
  var modal;
  // Data To Export
  var exportData;
  
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
      punchListModal: 'punch-modal',
      punchListModalTitle: 'punch-modal-title',
      punchListModalText: 'punch-modal-text',
      punchListModalActionOk: 'punch-modal-action-ok',
      punchListModalActionCancel: 'punch-modal-action-cancel',
      punchListCommentCount: 'punchlist-comment-count-',
  };
  
  // Templates used on Punch List
  const templates = {
    punchListLoading : `<div class="punchlist-loader"></div>`,
    punchlistProjectTemplate : ({ id, name, selected }) => `<option value="${id}" ${selected}>${name}</option>`,
    // Template of the container 
    punchListContainerTemplate: ({ title, projects }) => `
    <div id="${selectorsIds.punchListWorking}" class="punchlist-working hidden">
      <div class="punchlist-modal hidden" id="${selectorsIds.punchListModal}">
        <div class="title" id="${selectorsIds.punchListModalTitle}">Confirm</div>
        <div class="text" id="${selectorsIds.punchListModalText}"></div>
        <div class="actions">
          <button id="${selectorsIds.punchListModalActionOk}" class="button confirm">Confirm</button>
          <button id="${selectorsIds.punchListModalActionCancel}" class="button cancel">Cancel</button>
        </div>
      </div>
    </div>
    <div class="punchlist-title">
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
    </div>
    <a id="punchListExportData" style="display:none"></a>`,       
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
    punchListItemTemplate: (item) =>  `
    <div class="punchlist-item-container" id="${ selectorsIds.punchListItem + item.id}" data-id="${item.id}">
      <input type="checkbox" id="check-punch-item-${item.id}" ${item.punched ? 'checked': ''} data-id="${item.id}" data-action="punchlist-item-action-checked"/>    
      <div class="punchlist-item">
        <div class="punchlist-item-label">
          <label for="check-punch-item-${item.id}" class="punchlist-item-label-text">
            <i class="fa fa-check"></i> 
            <span class="punchlist-item-label-text-line">
              <span class="punchlist-item-label-text-data" id="${selectorsIds.punchListItemText + item.id}">
              ${item.task}
              </span>
            </span>
          </label>
        </div>
        <div class="punchlist-item-action" title="edit" data-action="punchlist-item-action-edit" data-id="${item.id}">
          <i class="fas fa-pen punchlist-item-action-edit" data-action="punchlist-item-action-edit" data-id="${item.id}"></i>
        </div>
        <div class="punchlist-item-action comment" title="comments" data-action="punchlist-item-action-comment" data-id="${item.id}">
          <div class="fa-stack fa-xs" data-action="punchlist-item-action-comment" data-id="${item.id}">
            <i class="fa fa-comment fa-stack-2x punchlist-item-action-comment"></i>
            <span class="fa fa-stack-1x fa-inverse" data-action="punchlist-item-action-comment" id="${selectorsIds.punchListCommentCount + item.id}" data-id="${item.id}">${(item.comments) ? item.comments.length:'0'}</span>
          </div>
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
        <i class="fa fa-plus"></i> Add Comment
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
    // Project Id
    projectId: null,
    // Set confirmation when setting a task as done
    confirmCheck: true,
    // Set confirmation before deleting an item
    confirmDeleteItem: true,
    // Set confirmation before deleting a comment
    confirmDeleteComment: true,    
  };
  //
  // Methods
  //
  /**
  * Set Punch List to working status. It will wait until an action is complete.
  * No other action can be done when it's on working state
  * @private
  */  
  var workingStart = function() {
      disabled = true;
      working.classList.remove('hidden');    
  }
  /**
  * Set Punch List to normal status. All action are available.
  * @private
  */  
  var workingEnd = function() {
      disabled = false;
      working.classList.add('hidden');    
  }
  /**
  * Call modal window to confirm an action
  * @private
  */  
  var callModalConfirm = function(text, confirmAction, cancelAction) {
    var modalText = modal.querySelector('#' + selectorsIds.punchListModalText);
    var modalActionOk = modal.querySelector('#' + selectorsIds.punchListModalActionOk);
    var modalActionCancel = modal.querySelector('#' + selectorsIds.punchListModalActionCancel);    
    modalText.innerHTML = text;
    modal.classList.remove('hidden');
    workingStart();
    modalActionOk.onclick = function() {
      modal.classList.add('hidden');
      workingEnd();
      if(confirmAction) {
        confirmAction();
      }
    }

    modalActionCancel.onclick = function() {
      modal.classList.add('hidden');
      workingEnd();
      if(cancelAction) {
        cancelAction();
      }
    }    
      
  }  
  var updateCommentCount = function(itemId) {
    var comments = punchListItems.querySelector('#' + selectorsIds.punchListComments + itemId);
    var commentCount = punchListItems.querySelector('#' + selectorsIds.punchListCommentCount + itemId);
    var count = comments.querySelectorAll('.punchlist-comment').length;
    commentCount.innerHTML = count;
  }
  /**
  * Creates the primary container where the list will be added.
  * Also set the css class for it
  * @private
  * @param {HtmlElemet} Container Element
  */
  var createPunchListContainer = function(elem) {
    // Set selected to current project
    var projects = settings.projects.map(function(el) {
      var o = Object.assign({}, el);
      if(o.id == settings.projectId) {
        o.selected = 'selected';
      } else {
        o.selected = '';
      }
      return o;
    });

    elem.classList.add('punchlist-container');
    
    var htmlPunchListContainer = [{ title: settings.title, projects: projects }].map(templates.punchListContainerTemplate).join('');
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
    var punchItem = punchListItems.querySelector('#' + selectorsIds.punchListItem + id);

    var confirmAction = function() {
      animateRemove(punchItem);
    };

    var cancelAction = null;

    if(settings.itemAPICall) {
      
      confirmAction = function() {
        workingStart();
        
        var callBack = function(data) {
          workingEnd();
                  
          animateRemove(punchItem);
        };
              
        var errorCallBack = function (data) {
          
          console.error(data);      
          workingEnd();
          
        };

        Utils.apiCall('DELETE', settings.itemAPICall + '/' + id, null, callBack, errorCallBack, settings.apiToken ); 
      }      
    }

    if(settings.confirmDeleteItem) {
      callModalConfirm('Do you want to remove task?', confirmAction, cancelAction);
    } else {
      confirmAction();
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

    var cancelAction = function() {
      item.checked = !item.checked;
    };

    var confirmAction = function() {};

    if(settings.itemAPICall) {
      confirmAction = function() {
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
      };
    } 

    if(settings.confirmCheck) {
      callModalConfirm('Do you want to change task status?', confirmAction, cancelAction);
    } else {
      confirmAction();
    }

  }; 
  
  var createInputText = function (id, value, maxLength) {
    var input = document.createElement('textarea');
    input.id = id;
    input.spellcheck=true;
    if(value) {
      input.value = value;
    }
    if(maxLength) {
      input.setAttribute('maxlength', maxLength);
    }
    input.style.width = '100%';
    input.addEventListener('keydown', keyPressEventHandler, false);
    autosize(input);
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
        var date = new Date();
        var item = [{id: date.getTime(), task:newTask,comments:[], tags:[], data:[]}];
        var newItemHmltring = Utils.map(item, templates.punchListItemTemplate).join('');
        punchItemToRemove.remove();
        punchListItemsCache.innerHTML = punchListItemsCache.innerHTML + newItemHmltring;        
      }
    } else {
      punchItemToRemove.remove();
    }    
  };    
  /**
  * Edit item 
  * @private
  */
  var editItem = function(item) {    
    var id = item.getAttribute('data-id');
    var itemText = mainContainer.querySelector('#' + selectorsIds.punchListItemText + id);
    var value = itemText.innerHTML.trim();
    // Create new input
    var input = createInputText('punch-item-edit-input', value, 255);
    input.setAttribute('data-id',id);
    // Add the blur event to calll when losing focus
    input.addEventListener('blur', addEventHandler, false);
    input.setAttribute('data-old', value);
    itemText.innerHTML = '';
    itemText.append(input);
    // Set focus on the input
    input.focus();
  };  
  /**
  * Edit item 
  * @private
  */
  var undoEdit = function(item) {    
    var id = item.getAttribute('data-id');
    var itemText = mainContainer.querySelector('#' + selectorsIds.punchListItemText + id);
    itemText.innerHTML = item.getAttribute('data-old');
  };  
  /**
  * Edit item action
  * @private
  *  @param {HtmlElemet} HtmlElement that is the target of text
  */
  var editItemAction = function(item) {    

    workingStart();        

    var id = item.getAttribute('data-id');

    var itemText = mainContainer.querySelector('#' + selectorsIds.punchListItemText + id);


    if(settings.itemAPICall) {
      var callBack = function(data) {
        var task = standardizeItem(data);
        itemText.innerHTML = task.task;
        workingEnd();        
      };

      var errorCallBack = function (data) {
        console.error(data);      
        itemText.innerHTML = item.getAttribute('data-old');
        workingEnd();
      };

      var data = {title:item.value};
      
      Utils.apiCall('PUT', settings.itemAPICall + '/' + id, data, callBack, errorCallBack, settings.apiToken );       
    } else {
      itemText.innerHTML = item.value;
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

          updateCommentCount(id);

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
        updateCommentCount(id);
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

    var itemId = punchItemComment.closest('.punchlist-item-container').getAttribute('data-id');; 



    var confirmAction = function() {
      punchItemComment.remove();
      updateCommentCount(itemId);
    };

    var cancelAction = null;

    if(settings.commentAPICall) {
      
      confirmAction = function() {
        workingStart();
        
        var callBack = function(data) {
          punchItemComment.remove();
          updateCommentCount(itemId);
          workingEnd();
        };
              
        var errorCallBack = function (data) {
          
          console.error(data);      
          workingEnd();
          
        };

        Utils.apiCall('DELETE', settings.commentAPICall + '/' + id, null, callBack, errorCallBack, settings.apiToken ); 
      }      
    }

    if(settings.confirmDeleteComment) {
      callModalConfirm('Do you want to remove this comment?', confirmAction, cancelAction);
    } else {
      confirmAction();
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
        //  When the action came from the add item link        
        case 'punchlist-item-action-edit':
          editItem(event.target);
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
        case 'punch-item-edit-input':
          editItemAction(event.target);
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
          event.target.disabled = true;
          // Remove Listener to avoid problem with none existing object because it will delete de input
          event.target.removeEventListener('blur', addEventHandler, false);
          addNewItemAction(event.target);
        break;
      case 'punch-comment-input-text':
        event.target.disabled = true;
        // Remove Listener to avoid problem with none existing object because it will delete de input
        event.target.removeEventListener('blur', addEventHandler, false);
        addNewItemCommentAction(event.target);
      case 'punch-item-edit-input':
        // Remove Listener to avoid problem with none existing object because it will delete de input
        event.target.removeEventListener('blur', addEventHandler, false);
        event.target.disabled = true;        
        editItemAction(event.target);        
      break;          
      }    
    } else if (key === 27) {
      var id = event.target.getAttribute('id');
      if(id == 'punch-item-edit-input') {
        event.target.removeEventListener('blur', addEventHandler, false);
        event.target.disabled = true;
        undoEdit(event.target);
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
      mainContainer.addEventListener('change', selectEventHandler, true); 
      working = mainContainer.querySelector('#'+ selectorsIds.punchListWorking);
      modal = mainContainer.querySelector('#'+ selectorsIds.punchListModal);
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
      punchListItems.innerHTML = '';
    }
  };

  punchList.export = function () {
    if ( !settings ) return;
    // Will only be called if the fillDataCall is added
    if(settings.projectAPICall) {
      
      var projectsInput = mainContainer.querySelector('#' + selectorsIds.punchListProjects);
      
      projectId = projectsInput.value;
      
      workingStart();
      
      var callBack = function (data) {

        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        var dlAnchorElem = document.getElementById('punchListExportData');
        dlAnchorElem.setAttribute("href",     dataStr     );
        dlAnchorElem.setAttribute("download", "punchlist.json");
        dlAnchorElem.click();
        workingEnd(); 
      }
      
      var errorCallBack = function (data) {
        console.error(data);
        workingEnd();        
      }

      Utils.apiCall('GET', settings.projectAPICall + '/' + projectId, null, callBack, errorCallBack, settings.apiToken );
    }

  };

  return punchList;
});