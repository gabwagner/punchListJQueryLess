
;(function ( $, window, document, undefined ) {
    var punchList = 'defaultPunchList';
  
    PunchList.defaults = {
      /* Title of the Punch List */
      title: "Punch List",
      /* Width of the container. If not set, will expand to the size of the parent */
      width: null,
      /* RestFULL API CALL. Response must be JSON */
      fillDataCall: null,
      /* JSON mapping to convert to standarize items */
      fillDataTransform: null,
      /* Handler to be called one a item is added 
          addItemHandler(itemId, val)  
            itemId: is the unique id that can be used to return the dom of the object 
            val: is the task value the new item will have 
      */
      addItemHandler: null,
      /* Handler to be called when an item is removed 
        removeItemHandler(itemId, itemData)
          itemId: is the unique id that can be used to return the dom of the object 
          itemData: is the 'item' data $(#itemId).data('item')
      */
      removeItemHandler: null,
      /* Handler to be called when an item change is status 
        removeItemHandler(itemId, itemData, checked)
          itemId: is the unique id that can be used to return the dom of the object 
          itemData: is the 'item' data $(#itemId).data('item')
          checked: boolean. It tells if the item has been checked or unchecked
      */    
      checkedItemHandler: null,
      // If set on false will not validate the JSON schema
      // If JSON is invalid the items will not be added in the list
      validateJSON: true,
      /* Template of the container */
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
      /* Template for the data that will be added in each item */
      punchListDataTemplate: (data) =>  `"${data.name}":"${data.value}"`,      
      /* Template of the tags in the comment */
      punchListCommentTagsTemplate: (tag) =>  `<b>${tag.name}</b>: ${tag.value}`,
      /* Template of the comments */
      punchListCommentTemplate: (comment) =>  `<div class="punchlist-comment">
          <div class="punchlist-comment-text">${comment.comment}</div>
          <div class="punchlist-comment-tag">${(comment.tags) ? comment.tags.map(PunchList.defaults.punchListCommentTagsTemplate).join(' - ') : ''}${comment.deletable ? '<i class="fa fa-times-circle punchlist-item-comment-action-remove"></i>':''}</div>
      </div>`,
      /* Template of the tags in the item */
      punchListItemTagsTemplate: (tag) =>  `<div class="punchlist-item-tag"><b>${tag.name}</b>: ${tag.value}</div>`,
      /* Template of the item of the punch list*/
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
  // Punch List Constructor
  // Override default with provided options
  function PunchList( element, options ) {    
    this.element = element;
    this.options = $.extend( {}, PunchList.defaults, options) ;
    this._defaults = PunchList.defaults;
    this._name = punchList;
    // Index is used to provide unique id to new items
    this._index = 0;
    this.init();
  }          
  // Initilize function
  // If api call is set, add the provide items from the api call to the list.
  PunchList.prototype.init = function() {    
    var self = this;
    // Create main punch-list container, add it to the parent container and add specific class for rendering
    var htmlPunchListContainer = [{title: this.options.title}].map(this.options.punchListContainerTemplate).join('');
    $(this.element).html(htmlPunchListContainer);
    $(this.element).addClass('punchlist-container');
    if(this.options.width) {
      $(this.element).width(this.options.width);
    }
    // Populate the punchlist if api call is added
    this.populatePunchList();
    /* Adding Add Behaviour */
    $('#punchlist-item-action-add').click(function(){ self.addItem() }); 
  }
  // Prepopulate the punchlist with user data
  PunchList.prototype.populatePunchList = function() {
    var self = this;
    // Will only be called if the fillDataCall is added
    if(this.options.fillDataCall) {
      $.ajax({
        url: this.options.fillDataCall,
        dataType: 'json',
        success: function( data ) {
          self._index = data.length;
          // Standarize data in case that information is not as punch list is expecting
          var standarizeData = self.standardizeData(data);
          // Draw Tasks into the punchList
          self.drawItems(standarizeData);
        },
        error: function( xhr, status, error ) {
          var message = (error.message) ? error.message : error;
          console.error("{PunchList][populatePunchList] Error while retrieving data. Status:'" + status + "' - Message:'" + message + "'");
        }
      });        
    } 
  }  
  /* 
    Transform User Data to Punch List Data
    Transform JSON-Object:
    Expected Schema:
      task      : This is the userdata property where is the description of the task.
      checked   : This is the userdata property where is a boolean value that inform if the task is complete or not.
                  If not set all task will be in not complete state.
      data      : This is an array of key value pair of field. This data will be added in each task item that is added.
                  This information is send when the task is deteled or change it's complete state.
                  This property is not required.
                  KeyValue Pair Properties:
                    name  ->  The key property that will be added in data.
                    field ->  The property field in the userdata that will be use as value.
      tags      : This is an array of key value pair of field. This data will be shown under the task name to add extra 
                  information that could be need.
                  This property is not required.
                  KeyValue Pair Properties:
                    name    ->  The key property that will be added in data.
                    field   ->  The property field in the userdata that will be use as value.
                    convert ->  Conver the value in case that need. Current there is a unique "date".
                                "date": Convert from String to Date and return localeString of it.
      comments  : This is an object property. It will contain comments of the task that are inside of the userdata.
                  This property is not required.
                  Object Properties:
                    listField : Property in userdata where the Arrays of Comments are. 
                    field     : The property inside the array where the proper comment is.
                    deletable : Property informing if the comments in userdata can be deleted.
                    tags      : See tags.
    
    Example:
    
      var jsonTransform = {
        data: [
        {
          field: "id",
          name: "id"
        }],
        task: "item",
        checked: "index",
        tags: [ 
          { 
            field:"project",
            name:"Project",
            convert: null,
          }, 
          {
            field:"datetime",
            name:"Date",
            convert: "date", 
          }
        ],
        comments: { 
          listField: "comments", 
          field:"comment",
          deletable: false,
          tags: [
            {
              field: "user",
              name: "User",
              convert: null,
            }
          ]
        }
      }   
  */
  PunchList.prototype.standardizeData = function(data) {
    var self = this;
    var result = [];
    if(this.options.fillDataTransform) {
      var transform = this.options.fillDataTransform;
      $.map(data, function(item) {
        var newItem = {};
        newItem.task = item[transform.task];
        newItem.checked =  item[transform.checked];
        newItem.comments = [];
        newItem.tags = [];
        newItem.data = [];
        if(transform.data) {
          $.map(transform.data, function(data) {
            var newData = {};
            newData.name = data.name;
            newData.value = item[data.field];
            newItem.data.push(newData);
          });
        }
        
        if(transform.tags) {
          $.map(transform.tags, function(tag) {
            var newTag = self.standardizeTag(item, tag);
            newItem.tags.push(newTag);
          });
        }
        if(transform.comments) {
          $.map(item[transform.comments.listField], function(comment) {
            var newComment = {};
            newComment.comment = comment[transform.comments.field];
            newComment.deletable = transform.comments.deletable;
            newComment.tags = [];

            if(transform.comments.tags) {
              $.map(transform.comments.tags, function(tag) {
 
                var newTag = self.standardizeTag(comment, tag);

                newComment.tags.push(newTag);
              });                
            }
            newItem.comments.push(newComment);
          });
        }
        result.push(newItem);
      });
    } else {
      result = data;
    }  
    return result;
  }
  // Function to standarize tag
  PunchList.prototype.standardizeTag = function(item, tag) {
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
  }
  /*
    Draw a list of tasks provided using defined templates functions. 
    Expected schema:
      task    : Field for the task description. 
      checked : boolean indicating if the task is done or not.
      data    : An array of KeyValuePair. This information will be added
                as data inside the task items and will be sent when the   
                task is deleted or it state is changed.
      tags    : An array of KeyValuePair. This information will be shown
                under the task to provide more context of the task.
      comments: An array of comments that will be shown under the task.
                Expected comment schema:
                  comment   : String with the comment.
                  deletable : boolean declaring if the comment can be 
                              deleted.
                  tags      : An array of KeyValuePair. This information 
                              will be shown under the task to provide more 
                              context of the task.
                              
    Example:
    
    var tasks = [ {
        task:"Task Description",
        checked:false,
        data: [ {
          name: 'id',
          value: 'TaskUniqueIDonOthePlatform',
          },
          ...
        ],
        tags: [ {
          name: 'User',
          value: 'Boss',
          },
          {
          name: 'Date',
          value: 'Yesterday',
          },
          ...
        ],        
        comments: [ {
          comment: 'This is my comment',
          deletable: false,
          tags: [ {
          name: 'User',
          value: 'Boss',
          },
          {
          name: 'Date',
          value: 'Yesterday',
          },
          ...
          ] },
        ...
        ] ,
        ...
      },
      ...
      ];
    
  */
  PunchList.prototype.drawItems = function(tasks) {
    var htmlPunchListContainer = tasks.map(this.options.punchListItemTemplate).join('');
    var punchlist_items = $(this.element).find('#punchlist-items');
    punchlist_items.html(htmlPunchListContainer);    
    /* Adding Behaviour for all tasks */
    this.setItemFunctionality($(this.element));
  }
// Set the behaviour for the new item. 
  // Behaviours: 
  //  Remove Item
  //  Expand Comments
  //  Add Comment
  // Set removeItemHandler
  // Set checkedItemHandler
  PunchList.prototype.setItemFunctionality = function(item) {
    var self = this;
    
    item.find('.punchlist-item-action-remove').click( function(){
        var parentItem = $(this).parent().parent().parent();
        if(self.options.removeItemHandler) {
            if(self.options.removeItemHandler(parentItem.attr('id'), parentItem.data('item'))) {
              self.removeItem(parentItem);
            } else {
              console.warn("[PunchList][setItemFunctionality]Item could not be removed - check handler removeItemHandler");
            }
        } else {
          self.removeItem(parentItem);
        }
    });
    
    item.find('.punchlist-item-comment-action-remove').click( function(){
        $(this).parent().parent().remove();
    });   
    
    item.find('.punchlist-item-action-comment').click(function(){
      var parentItem = $(this).parent().parent().parent();
      $(parentItem).find('.punchlist-comments').toggleClass('hidden');
    });
    
    item.find('.punchlist-item-comment-action-add').click(function(){
      self.addComment($(this).parent());
    });    
    
    item.find('input[type=checkbox]').change(function() {
        if(self.options.checkedItemHandler) {
            var parentItem = $(this).parent().parent().parent();
            if(!self.options.checkedItemHandler(parentItem.attr('id'), parentItem.data('item'), $(this).prop("checked"))) {
              console.warn("[PunchList][setItemFunctionality] Item could not change state - check handler checkedItemHandler");
              $(this).prop("checked", !$(this).prop("checked"));
            }
        }
    });
  }
  // Add new comment. If not comment is set the comment is removed automaticallly
  // New comments will have the remove functionallity
  PunchList.prototype.addComment = function(item) {
    var comments = item.find('.punchlist-comments');
    var newComment = {comment:'', deletable:true, tags:[]};
    var now = (new Date()).toLocaleString();
    newComment.tags.push({name:'User',value:'Me'});
    newComment.tags.push({name:'Date',value:now});
    var new_comment_html = $.map([newComment],this.options.punchListCommentTemplate).join('');
    var newItem = $(new_comment_html).prependTo(comments);
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'punch-item-comment';
    input.style.width = "100%";
    var toAppendInput = newItem.find('.punchlist-comment-text');
    var input = $(input).appendTo(toAppendInput);
    input.focus();    
    var self = this;
    input.enterKey(function(){
      $(this).trigger('enterEvent');
    });
    input.on('blur enterEvent',function(){
      var itemComment = input.val();
      var itemCommentLength = itemComment.length;
      if (itemCommentLength > 0) {
        $(this).parent().html(itemComment);
        newItem.find('.punchlist-item-comment-action-remove').click( function(){
          newItem.remove();
        });        
      } else {
        newItem.remove();
      }
    });    
  }
  // Add new punch list item. If not title is set the new item is removed automatically
  PunchList.prototype.addItem = function() {
    this._adding = true;
    this._index++;
    var punchlist_items = $(this.element).find('#punchlist-items');
    var new_item_html = $.map({ [this._index]:{task:'',comments:[], tags:[], data:[]}},this.options.punchListItemTemplate).join('');
    var newItem = $(new_item_html).appendTo(punchlist_items);
    newItem.find('.punchlist-item-tags').remove();
    var toAppendInput = newItem.find('.punchlist-item-label-text-data');
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'punch-item';
    input.style.width = "100%";
    var input = $(input).appendTo(toAppendInput);
    input.focus();
    var self = this;
    input.enterKey(function(){
      $(this).trigger('enterEvent');
    });
    input.on('blur enterEvent',function(){
      var todoTitle = input.val();
      var todoTitleLength = todoTitle.length;
      if (todoTitleLength > 0) {
        if(self.options.addItemHandler&&!self.options.addItemHandler(newItem.attr('id'), input.val())) {
          console.warn("[PunchList][addItem] Item could not be added - check handler addItemHandler");
          newItem.remove();
        } else {
           $(this).parent().html(todoTitle);
          self.setItemFunctionality(newItem);         
        }
      } else {
        newItem.remove();
      }
    });
  }
  // Remove desired dom item with animation
  PunchList.prototype.removeItem = function(element) {
      element.animate({
        left:"-30%",
        height:0,
        opacity:0
        },200);
      setTimeout(function(){
        $(element).remove();             
      }, 1000);
  }
  // Start plugin function
  $.fn.punchList = function ( options ) {
      return new PunchList( this, options );
  }
  // When enter is pressed call function
  $.fn.enterKey = function (fnc) {
    return this.each(function () {
        $(this).keypress(function (ev) {
            var keycode = (ev.keyCode ? ev.keyCode : ev.which);
            if (keycode == '13') {
                fnc.call(this, ev);
            }
        })
    });
  }
})( jQuery, window, document );