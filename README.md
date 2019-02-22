# Punch List Jquery Less

Simple plugin to organize tasks without Jquery

## Getting Started

These instructions will get you a copy of the project up and running on your local machine. 

### Installation
 
To install punchlist run the following command

```
npm install
```

### Examples

To run the examples run the following command

```
npm start
```

It will start listening on localhost port 3030

Examples:

1. Example with API Call: http://localhost:3030/example.html
2. Example without API Call: http://localhost:3030/example_b.html
3. Example with dev js: http://localhost:3030/example_dev.html

### Usage

1. Include Font Awesome CSS:

	```html
	 <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.1/css/all.css">
	```

2. Include Punch List CSS:

	```html
	 <link rel="stylesheet" href="dist/punchlist.css">
	```
  
3. Include Punch List JS:

	```html
	<script src="dist/punchlist.all.min.js"></script>
	```

5. Call the plugin:

	```javascript
	punchList.init(options);
	```
  
  ### Options
  
  Options are used to configure the Punch List.
  Detailed Options to be send:
  
| Property | Description |
| --- | --- |
| .container | **Required**. Selector for the main container of the Punch List |
| .title | Title of the Punch List |
| .width | Width of the container. If not set, will expand to the size of the parent |
|  .fillDataCall | RestFULL API CALL. Response must be JSON |
|  .fillDataTransform | JSON mapping to convert to standarize items. In case that .fillDataCall was used |
|  .addItemHandler | Handler to be called one a item is added <br> **Parameters** <br> **itemId**: is the unique id that can be used to return the dom of the object <br> **val**: is the task value the new item will have |
|  .removeItemHandler | Handler to be called when an item is removed <br> **Parameters** <br> **itemId**: is the unique id that can be used to return the dom of the object <br> **itemData**: is the 'item' data `$(#itemId).data('item')` |
|  .checkedItemHandler| Handler to be called when an item change is status <br> **Parameters** <br> **itemId**: is the unique id that can be used to return the dom of the object  <br> **itemData**: is the 'item' data `$(#itemId).data('item')` <br> **checked**: boolean. It tells if the item has been checked or unchecked |

  #### Example
  
```javascript
var options = {
  width: 600,
  fillDataCall: "json/response.json",
  fillDataTransform: jsonTransform,
  addItemHandler: onAdd,
  removeItemHandler: onDelete,
  checkedItemHandler: onChecked,
  container: "#punchlist-container"
};
```
  See also: [working example](example/example.html)
  
  ### JSON Data Transform
  
In order to be able to use a json not using the format expected in the punch list, a transformation must be made.
The transformation information must be set in an object.

| Property | Description |
| --- | --- |
| .task | This is the userdata property where is the description of the task. |
| .checked | This is the userdata property where is a boolean value that inform if the task is complete or not.<br>If not set all task will be in not complete state. |
|  .data | This is an array of key value pair of field. This data will be added in each task item that is added.<br>This information is send when the task is deteled or change it's complete state.<br>This property is not required.<br>KeyValue Pair Properties:<br>name  ->  The key property that will be added in data.<br>field ->  The property field in the userdata that will be use as value. |
|  .tags | This is an array of key value pair of field. This data will be shown under the task name to add extra information that could be need.<br>This property is not required.<br>KeyValue Pair Properties:<br>name    ->  The key property that will be added in data.<br>field   ->  The property field in the userdata that will be use as value.<br>convert ->  Conver the value in case that need. Current there is a unique "date".<br>"date": Convert from String to Date and return localeString of it. |
|  .comments | This is an object property. It will contain comments of the task that are inside of the userdata.<br>This property is not required.<br>Object Properties:<br>listField : Property in userdata where the Arrays of Comments are.<br>field     : The property inside the array where the proper comment is.<br>deletable : Property informing if the comments in userdata can be deleted.<br>tags      : See tags. |

  #### Example
  
```javascript
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
    };
```
  See also: [working example](example/example.html) and [converted json](example/json/response.json)
  
  ### Task Data 
  
  Data used in function ```drawItems(data)```.   
  
| Property | Description |
| --- | --- |
|task|Field for the task description| 
|checked|boolean indicating if the task is done or not.|
|data|An array of KeyValuePair. This information will be added as data inside the task items and will be sent when the task is deleted or it state is changed.|
|tags|An array of KeyValuePair. This information will be shown under the task to provide more context of the task.|
|comments|An array of comments that will be shown under the task.|

#### Comments

| Property | Description |
| --- | --- |
|comment|String with the comment.|
|deletable|boolean declaring if the comment can be deleted. |
|tags|An array of KeyValuePair. This information will be shown under the task to provide more context of the task.|
                              
####Example:
    
    ```javascript
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
    ```
  
   See also: [working example](example/example_b.html)
  
## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details
