var Rx = require('rx');
var modrain = {};
var _ = require('lodash');
var Promise = require('bluebird');

/**
 * Represents single node module
 */
function ModRain(name, handlers) {
  this.name = name;
  // Methods that are mounted
  this.handlers = handlers ? handlers : {};
}

/**
 *
 * Creating an observer for a single handler.
 *
 * @param namespace
 * @param handlerName
 * @param originalHandler
 * @returns {Observable<T>|Rx.Observable<T>}
 */
function createObserver(namespace, handlerName, originalHandler) {

  var ns = _.get(modrain, namespace);

  var observable = Rx.Observable.create(function(observer) {
    //Here, we are wrapping the original handler function in a function that wil call
    //the original function and also forward the result / error to the observable
    ns[handlerName] = function() {

      //Applying the original handler with the same context.
      return originalHandler.apply(this, arguments).then(function(handlerResult) {
        //Emitting the result to the observer. Any observer subscribers will then also emit.
        observer.onNext(handlerResult);
        return Promise.resolve(handlerResult);
      });
    };

    return function () {
      console.log("Disposed", this);
      //The observer is being disposed. Clean up the observer and re-assign the original function
      ns._observers[handlerName] = undefined;
      ns[handlerName] = originalHandler;
    }
  }).share();

  return observable;
}

/**
 *
 * Mounting an observe function to observe a handler.
 *
 * This allows users to observe a single handler
 *
 * E.g. for a namespace called "users" and a handler called "create", the user can write
 *
 * modrain.users.observe('create');
 *
 * to return a standard Observable.
 *
 * @param namespace
 * @private
 */
ModRain.prototype._mountObserve = function(namespace) {

  var ns = _.get(modrain, namespace);

  //Assigning the 'observe' function to the namespace.
  ns.observe = function(handlerName) {
    //Here we want to observe a particular handler

    //If the observer already exists, then use that one
    if (ns._observers[handlerName]) {
      console.log("Already Exists ", handlerName, ns._observers[handlerName]);
      return ns._observers[handlerName];
    }
    var originalHandler = ns[handlerName];

    //We need to create a new observer for this function, we wrap the original function
    ns._observers[handlerName] = createObserver(namespace, handlerName, originalHandler);

    return ns._observers[handlerName];
  };

  ns._observers = {};
};

/**
 * Register new method (handler) for module
 */
ModRain.prototype.registerHandler = function (handlerName, method) {
  console.log("** registerHandler ", handlerName, method);
  if (this.handlers[handlerName]) {
    throw Error("Module handler already registered", this.name, handlerName);
  }
  this.handlers[handlerName] = method;
};

/**
 *
 * Mount module to top level. If module exist throw error
 *
 * @param namespace
 * @param module
 * @private
 */
ModRain.prototype._mount = function (namespace, module) {
  _.set(modrain, namespace, module.handlers);
  this._mountObserve(namespace);
};

/**
 * Register new modular application module
 *
 * @param namespace {string} - full module namespace
 * @param handlers {object} - an object containing
 * @returns {*}
 */
modrain.registerModule = function (namespace, handlers) {
  if (_.get(modrain, namespace)) {
    throw Error("Module already registered for namespace: " + namespace);
  }
  var newModule = new ModRain(namespace,handlers);
  newModule._mount(namespace, newModule);

  return newModule;
};

module.exports = modrain;
