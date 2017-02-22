#### Node (from EventEmitter)

The base node which everything inherits from.

##### Options:

- __screen__ - The screen to be associated with.
- __parent__ - The desired parent.
- __children__ - An arrray of children.

##### Properties:

- Inherits all from EventEmitter.
- __type__ - Type of the node (e.g. `box`).
- __options__ - Original options object.
- __parent__ - Parent node.
- __screen__ - Parent screen.
- __children__ - Array of node's children.
- __data, _, $__ - An object for any miscellanous user data.
- __index__ - Render index (document order index) of the last render call.

##### Events:

- Inherits all from EventEmitter.
- __adopt__ - Received when node is added to a parent.
- __remove__ - Received when node is removed from it's current parent.
- __reparent__ - Received when node gains a new parent.
- __attach__ - Received when node is attached to the screen directly or
  somewhere in its ancestry.
- __detach__ - Received when node is detached from the screen directly or
  somewhere in its ancestry.

##### Methods:

- Inherits all from EventEmitter.
- __prepend(node)__ - Prepend a node to this node's children.
- __append(node)__ - Append a node to this node's children.
- __remove(node)__ - Remove child node from node.
- __insert(node, i)__ - Insert a node to this node's children at index `i`.
- __insertBefore(node, refNode)__ - Insert a node to this node's children
  before the reference node.
- __insertAfter(node, refNode)__ - Insert a node from node after the reference
  node.
- __detach()__ - Remove node from its parent.
- __emitDescendants(type, args..., [iterator])__ - Emit event for element, and
  recursively emit same event for all descendants.
- __get(name, [default])__ - Get user property with a potential default value.
- __set(name, value)__ - Set user property to value.


