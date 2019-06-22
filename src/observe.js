/*!
 * # ObserveJS 0.0.1
 *
 * Licensed MIT © Haozhi (Flik) Hu
 *
 */

// eslint-disable-next-line no-unused-vars
const ObserveJS = (function () {
  // target -> { prop: deep copy }
  const propMap = new Map();
  // Number of objects being observed
  let observedObjCount = 0;
  // Internal helper function, deep copy an object
  let cloneDeep = (obj) => {
    if (obj === null || !(obj instanceof Object)) return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Map || obj instanceof Set) return new obj.constructor(cloneDeep(Array.from(obj)));
    let clone = new obj.constructor();
    Object.keys(obj).forEach((key) => {
      clone[key] = cloneDeep(obj[key]);
    });
    return clone;
  };

  // Internal helper function, create a monitor for a prop
  let createMonitor = (target, propKey, callback, _prefix) => {
    // console.log('observe', propKey, 'of', cloneDeep(target));
    let propClone = cloneDeep(target[propKey]);
    let propToObserve = cloneDeep(target[propKey]);
    // Cannot watch constant
    if (!delete target[propKey]) throw new Error(`Cannot observe constant property "${propKey}"`);
    // Make a deep copy of the prop we want to observe
    propMap.get(target)[propKey] = propClone;

    // Proxy wrapper
    if (propToObserve instanceof Object) {
      // Catch value change
      let changeObserver = {
        set: (obj, prop, val) => {
          let oldVal = propMap.get(target)[propKey];
          obj[prop] = val;
          if (!(target instanceof Array) || prop !== 'length') callback.call(this, _prefix + propKey, oldVal, obj);
          propMap.get(target)[propKey][prop] = val;
          return (obj[prop] = val);
        },
        // proxy fall through/catch function call
        get: (obj, prop) => {
          if (prop === 'constructor') return obj[prop];
          let prototype = Reflect.getPrototypeOf(target[propKey]);
          if (prototype[prop] instanceof Function) {
            // original function
            const func = prototype[prop];

            // invoke the function on the target instead of the proxy to avoid proxy being called multiple time
            return function () {
              let oldVal = propMap.get(target)[propKey];
              func.apply(obj, arguments);
              callback.call(this, _prefix + propKey, oldVal, obj);
              func.apply(propMap.get(target)[propKey], arguments);
            };
          }
          return obj[prop];
        }
      };
      let proxy = new Proxy(propToObserve, changeObserver);
      Reflect.defineProperty(target, propKey, { value: proxy, writable: true, configurable: true });
    }

    // Track prop value using getter setter
    let propVal = target[propKey];

    let getter = function () {
      return propVal;
    };

    let setter = function (newVal) {
      // Record old value
      let oldVal = propClone;

      // Update value in propMap
      propVal = newVal;
      propClone = newVal;

      if (newVal instanceof Object) createMonitor(target, propKey, callback, _prefix);
      callback.call(this, _prefix + propKey, oldVal, newVal);
      return true;
    };
    Reflect.defineProperty(target, propKey, { get: getter, set: setter, configurable: true });
  };

  return {
    observe: (target, prop, callback, opts, _prefix = '') => {
      if (!(target instanceof Object)) throw new Error('target must be an object');
      if (!(callback instanceof Function)) throw new Error('callback must be a function');

      // Keep track of observed props
      if (!propMap.has(target)) {
        propMap.set(target, {});
      }
      // Read custom options
      const options = { observeDeletion: true, observeDeletionInterval: 500, depth: 1 };
      for (let optKey in opts) {
        if (optKey in options) {
          options[optKey] = opts[optKey];
        }
      }
      // depth and observeDeletionInterval must be integer
      if (!Number.isInteger(options.observeDeletionInterval) || !Number.isInteger(options.depth)) throw new Error('invalid options');

      // Preprocess passed in props
      // Accept single or array of prop name as input
      let propToObserve = [];
      let propList = prop instanceof Array ? prop : [prop];
      propList.forEach((propKey) => {
        // observe nonexistant props and double observe not allowed
        if (!(propKey in target)) throw new Error(`property ${propKey} does not exist`);
        if (propKey in propMap.get(target)) throw new Error(`property ${propKey} is already being observed`);
        propToObserve.push(propKey);
      });

      // Substitute prop with getter setter with callback
      propToObserve.forEach((propKey) => {
        createMonitor(target, propKey, callback, _prefix);
        if(_prefix === '') observedObjCount++;
        if (options.depth > 1) {
          // The prop we are observing
          let currProp = target[prop];
          for (let childPropKey in currProp) {
            // Child properties (being observed)
            let childProp = currProp[childPropKey];
            if (childProp instanceof Object) {
              // Recursively add observer to children of child property (not being observed)
              for (let subChildPropKey in childProp) {
                ObserveJS.observe(childProp, subChildPropKey, callback, { depth: options.depth - 1 }, `${_prefix}${prop} -> ${childPropKey} -> `);
              }
            }
          }
        }
        // Auto observe prop deletion
        if (options.observeDeletion) {
          // Check if the monitored prop is deleted
          setInterval(() => {
            for (let key in propMap.get(target)) {
              if (!(key in target)) {
                // monitor prop deletion
                let valBeforeDelete = propMap.get(target)[key];
                delete propMap.get(target)[key];
                ObserveJS.unobserve(target, key);
              }
            }
          }, options.observeDeletionInterval);
        }
      });
    },
    unobserve: (target, prop) => {
      if (!(target instanceof Object)) throw new Error('target must be an object');
      if (!propMap.has(target)) return;

      // All observed props
      let observedProps = propMap.get(target);
      // Delete the observed prop from prop map, set it back to the object
      let observedPropList = prop instanceof Array ? prop : [prop];
      observedPropList.forEach((propKey) => {
        Reflect.defineProperty(target, propKey, { value: observedProps[propKey], configurable: true, writable: true });
        delete observedProps[propKey];
        if (Object.keys(observedProps).length === 0) {
          propMap.delete(target);
          observedObjCount--;
        }
        if(observedObjCount === 0) propMap.clear();
      });
    },
    unobserveAll: (target) => {
      if (!(target instanceof Object)) throw new Error('target must be an object');
      let observedProps = propMap.get(target);
      for (let propKey in observedProps) {
        ObserveJS.unobserve(target, propKey);
      }
    }
  };
}());
