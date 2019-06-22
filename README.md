# Observe.JS

## About

A mini library that allows you to observe the properties change of an object in place instead of using a Proxy. Can observe nested attributes

## Installing

First download observe.js, then include it in your HTML page via a script tag
```html
<script src="observe.js"></script>
```

## Methods

```javascript
	/* parameters
	* target: object to be observed
	* prop: property to be observed, can be a string or an array of string
	* callback: callback when the observed properties change
	* opts: addtional options
	*		- depth: determines how deep do you wish to observe the properties
	*/
	ObserveJS.observe(target, prop, callback);
    
	/* parameters
	* target: object to be unobserved
	* prop: property to be unobserved, can be a string or an array of string
	*/
    ObserveJS.unobserve(target, prop);
    ObserveJS.unobserveAll(target);
```


## Usage

### ObserveJS.observe( )

```javascript
// object that we want to observe
let obj = {
	foo: 123,
	bar: 456,
    arr: [],
    nested: {
    	level1: {
        	name: 'lv1',
			level2: {
        		name: 'lv2'
        	}
        }
    }
};

// observe a single property
ObserverJS.observe(obj, 'foo', (propName, oldVal, newVal) => {
	console.log(propName, oldVal, newVal);
});

obj.foo = []; // foo 123 []

// observe multiple properties
ObserverJS.observe(obj, ['arr', 'bar'], (propName, oldVal, newVal) => {
	console.log(propName, oldVal, newVal);
});

obj.arr.push(1); // arr [] [1]
obj.arr.push(1);// arr [1] [1, 1]
obj.arr.fill('test'); // arr [1, 1] ['test', 'test']

// observe nested attributes
ObserverJS.observe(obj, 'nested', (propName, oldVal, newVal) => {
	console.log(propName, oldVal, newVal);
}, { depth:  2 });

obj.nested.level1.level2.name = 'lv2NewName'; // nested -> level1 -> level2 Object { name: "lv2" } Object { name: "lv2NewName" }
```

### ObserveJS.unobserve( )

```javascript
// unobserve a single property
ObserveJS.unobserve(obj, 'foo');

// unobserve multiple properties
ObserveJS.unobserve(obj, ['arr', 'bar']);

```

### ObserveJS.unobserveAll( )
```javascript
// unobserve all properties
ObserveJS.unobserveAll(obj);

```
 

