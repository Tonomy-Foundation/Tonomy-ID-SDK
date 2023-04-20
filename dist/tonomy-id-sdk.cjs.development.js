'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var eosio = require('@greymass/eosio');
var fetch = _interopDefault(require('cross-fetch'));
var rb = _interopDefault(require('@consento/sync-randombytes'));
var elliptic = _interopDefault(require('elliptic'));
var didJwt = require('@tonomy/did-jwt');
var didJwtVc = require('@tonomy/did-jwt-vc');
var antelopeDidResolver = require('@tonomy/antelope-did-resolver');
var didResolver = require('@tonomy/did-resolver');
var antelopeSsiToolkit = require('@tonomy/antelope-ssi-toolkit');
var socket_ioClient = require('socket.io-client');

function _regeneratorRuntime() {
  _regeneratorRuntime = function () {
    return exports;
  };
  var exports = {},
    Op = Object.prototype,
    hasOwn = Op.hasOwnProperty,
    defineProperty = Object.defineProperty || function (obj, key, desc) {
      obj[key] = desc.value;
    },
    $Symbol = "function" == typeof Symbol ? Symbol : {},
    iteratorSymbol = $Symbol.iterator || "@@iterator",
    asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
    toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
  function define(obj, key, value) {
    return Object.defineProperty(obj, key, {
      value: value,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }), obj[key];
  }
  try {
    define({}, "");
  } catch (err) {
    define = function (obj, key, value) {
      return obj[key] = value;
    };
  }
  function wrap(innerFn, outerFn, self, tryLocsList) {
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
      generator = Object.create(protoGenerator.prototype),
      context = new Context(tryLocsList || []);
    return defineProperty(generator, "_invoke", {
      value: makeInvokeMethod(innerFn, self, context)
    }), generator;
  }
  function tryCatch(fn, obj, arg) {
    try {
      return {
        type: "normal",
        arg: fn.call(obj, arg)
      };
    } catch (err) {
      return {
        type: "throw",
        arg: err
      };
    }
  }
  exports.wrap = wrap;
  var ContinueSentinel = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  var IteratorPrototype = {};
  define(IteratorPrototype, iteratorSymbol, function () {
    return this;
  });
  var getProto = Object.getPrototypeOf,
    NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      define(prototype, method, function (arg) {
        return this._invoke(method, arg);
      });
    });
  }
  function AsyncIterator(generator, PromiseImpl) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if ("throw" !== record.type) {
        var result = record.arg,
          value = result.value;
        return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        }) : PromiseImpl.resolve(value).then(function (unwrapped) {
          result.value = unwrapped, resolve(result);
        }, function (error) {
          return invoke("throw", error, resolve, reject);
        });
      }
      reject(record.arg);
    }
    var previousPromise;
    defineProperty(this, "_invoke", {
      value: function (method, arg) {
        function callInvokeWithMethodAndArg() {
          return new PromiseImpl(function (resolve, reject) {
            invoke(method, arg, resolve, reject);
          });
        }
        return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
      }
    });
  }
  function makeInvokeMethod(innerFn, self, context) {
    var state = "suspendedStart";
    return function (method, arg) {
      if ("executing" === state) throw new Error("Generator is already running");
      if ("completed" === state) {
        if ("throw" === method) throw arg;
        return doneResult();
      }
      for (context.method = method, context.arg = arg;;) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }
        if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
          if ("suspendedStart" === state) throw state = "completed", context.arg;
          context.dispatchException(context.arg);
        } else "return" === context.method && context.abrupt("return", context.arg);
        state = "executing";
        var record = tryCatch(innerFn, self, context);
        if ("normal" === record.type) {
          if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
          return {
            value: record.arg,
            done: context.done
          };
        }
        "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
      }
    };
  }
  function maybeInvokeDelegate(delegate, context) {
    var methodName = context.method,
      method = delegate.iterator[methodName];
    if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel;
    var record = tryCatch(method, delegate.iterator, context.arg);
    if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
    var info = record.arg;
    return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
  }
  function pushTryEntry(locs) {
    var entry = {
      tryLoc: locs[0]
    };
    1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
  }
  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal", delete record.arg, entry.completion = record;
  }
  function Context(tryLocsList) {
    this.tryEntries = [{
      tryLoc: "root"
    }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
  }
  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) return iteratorMethod.call(iterable);
      if ("function" == typeof iterable.next) return iterable;
      if (!isNaN(iterable.length)) {
        var i = -1,
          next = function next() {
            for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
            return next.value = undefined, next.done = !0, next;
          };
        return next.next = next;
      }
    }
    return {
      next: doneResult
    };
  }
  function doneResult() {
    return {
      value: undefined,
      done: !0
    };
  }
  return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", {
    value: GeneratorFunctionPrototype,
    configurable: !0
  }), defineProperty(GeneratorFunctionPrototype, "constructor", {
    value: GeneratorFunction,
    configurable: !0
  }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
    var ctor = "function" == typeof genFun && genFun.constructor;
    return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
  }, exports.mark = function (genFun) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
  }, exports.awrap = function (arg) {
    return {
      __await: arg
    };
  }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
    return this;
  }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
    void 0 === PromiseImpl && (PromiseImpl = Promise);
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
    return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
    return this;
  }), define(Gp, "toString", function () {
    return "[object Generator]";
  }), exports.keys = function (val) {
    var object = Object(val),
      keys = [];
    for (var key in object) keys.push(key);
    return keys.reverse(), function next() {
      for (; keys.length;) {
        var key = keys.pop();
        if (key in object) return next.value = key, next.done = !1, next;
      }
      return next.done = !0, next;
    };
  }, exports.values = values, Context.prototype = {
    constructor: Context,
    reset: function (skipTempReset) {
      if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
    },
    stop: function () {
      this.done = !0;
      var rootRecord = this.tryEntries[0].completion;
      if ("throw" === rootRecord.type) throw rootRecord.arg;
      return this.rval;
    },
    dispatchException: function (exception) {
      if (this.done) throw exception;
      var context = this;
      function handle(loc, caught) {
        return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
      }
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i],
          record = entry.completion;
        if ("root" === entry.tryLoc) return handle("end");
        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc"),
            hasFinally = hasOwn.call(entry, "finallyLoc");
          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
          } else {
            if (!hasFinally) throw new Error("try statement without catch or finally");
            if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
          }
        }
      }
    },
    abrupt: function (type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }
      finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
      var record = finallyEntry ? finallyEntry.completion : {};
      return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
    },
    complete: function (record, afterLoc) {
      if ("throw" === record.type) throw record.arg;
      return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
    },
    finish: function (finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
      }
    },
    catch: function (tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if ("throw" === record.type) {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }
      throw new Error("illegal catch attempt");
    },
    delegateYield: function (iterable, resultName, nextLoc) {
      return this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
    }
  }, exports;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}
function _asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}
function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}
function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;
  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}
function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct.bind();
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }
  return _construct.apply(null, arguments);
}
function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;
  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;
    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);
      _cache.set(Class, Wrapper);
    }
    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }
    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };
  return _wrapNativeSuper(Class);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
  if (it) return (it = it.call(o)).next.bind(it);
  if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return {
        done: true
      };
      return {
        done: false,
        value: o[i++]
      };
    };
  }
  throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}

var HttpError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(HttpError, _Error);
  function HttpError(httpError) {
    var _this;
    _this = _Error.call(this, 'HTTP Error') || this;
    // Ensure the name of this error is the same as the class name
    _this.name = _this.constructor.name;
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    //  @see Node.js reference (bottom)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(_assertThisInitialized(_this), _this.constructor);
    }
    _this.stack = new Error().stack;
    _this.path = httpError.path;
    _this.response = httpError.response;
    if (httpError.line) _this.line = httpError.line;
    if (httpError.column) _this.line = httpError.column;
    if (httpError.sourceURL) _this.sourceURL = httpError.sourceURL;
    return _this;
  }
  return HttpError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
var SdkError = /*#__PURE__*/function (_Error2) {
  _inheritsLoose(SdkError, _Error2);
  function SdkError(message) {
    var _this2;
    _this2 = _Error2.call(this, message) || this;
    // Ensure the name of this error is the same as the class name
    _this2.name = _this2.constructor.name;
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(_assertThisInitialized(_this2), _this2.constructor);
    }
    _this2.stack = new Error().stack;
    return _this2;
  }
  return SdkError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
function createSdkError(message, code) {
  var error = new SdkError(message);
  if (code) {
    error = new SdkError(code + ': ' + message);
    error.code = code;
  }
  return error;
}
// using never to suppress error https://bobbyhadz.com/blog/typescript-function-that-throws-error#:~:text=To%20declare%20a%20function%20that,terminate%20execution%20of%20the%20program.
function throwError(message, code) {
  throw createSdkError(message, code);
}

(function (SdkErrors) {
  SdkErrors["UsernameTaken"] = "UsernameTaken";
  SdkErrors["AccountDoesntExist"] = "AccountDoesntExist";
  SdkErrors["UsernameNotFound"] = "UsernameNotFound";
  SdkErrors["DataQueryNoRowDataFound"] = "DataQueryNoRowDataFound";
  SdkErrors["UpdateKeysTransactionNoKeys"] = "UpdateKeysTransactionNoKeys";
  SdkErrors["CouldntCreateApi"] = "CouldntCreateApi";
  SdkErrors["PasswordFormatInvalid"] = "PasswordFormatInvalid";
  SdkErrors["PasswordTooCommon"] = "PasswordTooCommon";
  SdkErrors["PasswordInValid"] = "PasswordInValid";
  SdkErrors["KeyNotFound"] = "KeyNotFound";
  SdkErrors["OriginNotFound"] = "OriginNotFound";
  SdkErrors["JwtNotValid"] = "JwtNotValid";
  SdkErrors["WrongOrigin"] = "WrongOrigin";
  SdkErrors["SettingsNotInitialized"] = "SettingsNotInitialized";
  SdkErrors["MissingParams"] = "MissingParams";
  SdkErrors["InvalidKey"] = "InvalidKey";
  SdkErrors["invalidDataType"] = "invalidDataType";
  SdkErrors["missingChallenge"] = "missingChallenge";
  SdkErrors["CommunicationNotConnected"] = "CommunicationNotConnected";
  SdkErrors["CommunicationTimeout"] = "CommunicationTimeout";
  SdkErrors["OriginMismatch"] = "OriginMismatch";
  SdkErrors["PinInValid"] = "PinInValid";
  SdkErrors["AccountNotFound"] = "AccountNotFound";
  SdkErrors["UserNotLoggedIn"] = "UserNotLoggedIn";
})(exports.SdkErrors || (exports.SdkErrors = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (SdkErrors) {
  /*
   * Returns the index of the enum value
   *
   * @param value The value to get the index of
   */
  function indexFor(value) {
    return Object.keys(SdkErrors).indexOf(value);
  }
  SdkErrors.indexFor = indexFor;
  /*
   * Creates an SdkErrors from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = SdkErrors.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(SdkErrors)[index];
  }
  SdkErrors.from = from;
})(exports.SdkErrors || (exports.SdkErrors = {}));

var settings;
var initialized = false;
function setSettings(newSettings) {
  settings = newSettings;
  initialized = true;
}
function getSettings() {
  if (!initialized) {
    throwError('Settings not yet initialized', exports.SdkErrors.SettingsNotInitialized);
  }
  return settings;
}

var api;
function getApi() {
  return _getApi.apply(this, arguments);
}
function _getApi() {
  _getApi = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    var settings;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!api) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return", api);
        case 2:
          settings = getSettings();
          api = new eosio.APIClient({
            url: settings.blockchainUrl,
            provider: new eosio.FetchProvider(settings.blockchainUrl, {
              fetch: fetch
            })
          });
          if (!api) throwError('Could not create API client', exports.SdkErrors.CouldntCreateApi);
          return _context.abrupt("return", api);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getApi.apply(this, arguments);
}
function getChainInfo() {
  return _getChainInfo.apply(this, arguments);
}
function _getChainInfo() {
  _getChainInfo = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    var api;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return getApi();
        case 2:
          api = _context2.sent;
          _context2.next = 5;
          return api.v1.chain.get_info();
        case 5:
          return _context2.abrupt("return", _context2.sent);
        case 6:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getChainInfo.apply(this, arguments);
}

var Eosio = {
  __proto__: null,
  getApi: getApi,
  getChainInfo: getChainInfo
};

function createSigner(privateKey) {
  return {
    sign: function sign(digest) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", privateKey.signDigest(digest));
            case 1:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }))();
    }
  };
}
function createKeyManagerSigner(keyManager, level, challenge) {
  return {
    sign: function sign(digest) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return keyManager.signData({
                level: level,
                data: digest,
                challenge: challenge
              });
            case 2:
              return _context2.abrupt("return", _context2.sent);
            case 3:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }))();
    }
  };
}
var AntelopePushTransactionError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(AntelopePushTransactionError, _Error);
  function AntelopePushTransactionError(err) {
    var _this;
    _this = _Error.call(this, 'AntelopePushTransactionError') || this;
    _this.code = err.code;
    _this.message = err.message;
    _this.error = err.error;
    _this.stack = new Error().stack;
    // Ensure the name of this error is the same as the class name
    _this.name = _this.constructor.name;
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    //  @see Node.js reference (bottom)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(_assertThisInitialized(_this), _this.constructor);
    }
    return _this;
  }
  var _proto = AntelopePushTransactionError.prototype;
  _proto.hasErrorCode = function hasErrorCode(code) {
    return this.error.code === code;
  };
  _proto.hasTonomyErrorCode = function hasTonomyErrorCode(code) {
    // TODO iterate over deatils array instead of only looking at first element
    return this.error.details[0].message.search(code) > 0;
  };
  return AntelopePushTransactionError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
function transact(_x, _x2, _x3) {
  return _transact.apply(this, arguments);
}
function _transact() {
  _transact = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(contract, actions, signer) {
    var api, abi, actionData, info, header, transaction, signDigest, signature, signedTransaction, res, error;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return getApi();
        case 2:
          api = _context3.sent;
          _context3.next = 5;
          return api.v1.chain.get_abi(contract);
        case 5:
          abi = _context3.sent;
          // Create the action data
          actionData = [];
          actions.forEach(function (data) {
            actionData.push(eosio.Action.from(_extends({}, data, {
              account: contract
            }), abi.abi));
          });
          // Construct the transaction
          _context3.next = 10;
          return api.v1.chain.get_info();
        case 10:
          info = _context3.sent;
          header = info.getTransactionHeader();
          transaction = eosio.Transaction.from(_extends({}, header, {
            actions: actionData
          })); // Create signature
          signDigest = transaction.signingDigest(info.chain_id);
          _context3.next = 16;
          return signer.sign(signDigest);
        case 16:
          signature = _context3.sent;
          signedTransaction = eosio.SignedTransaction.from(_extends({}, transaction, {
            signatures: [signature]
          })); // Send to the node
          _context3.prev = 18;
          _context3.next = 21;
          return api.v1.chain.push_transaction(signedTransaction);
        case 21:
          res = _context3.sent;
          _context3.next = 32;
          break;
        case 24:
          _context3.prev = 24;
          _context3.t0 = _context3["catch"](18);
          error = _context3.t0;
          if (!(error.response && error.response.headers)) {
            _context3.next = 31;
            break;
          }
          if (!error.response.json) {
            _context3.next = 30;
            break;
          }
          throw new AntelopePushTransactionError(error.response.json);
        case 30:
          throw new HttpError(error);
        case 31:
          throw _context3.t0;
        case 32:
          return _context3.abrupt("return", res);
        case 33:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[18, 24]]);
  }));
  return _transact.apply(this, arguments);
}

var Transaction = {
  __proto__: null,
  AntelopePushTransactionError: AntelopePushTransactionError,
  transact: transact,
  createSigner: createSigner,
  createKeyManagerSigner: createKeyManagerSigner
};

(function (KeyManagerLevel) {
  KeyManagerLevel["PASSWORD"] = "PASSWORD";
  KeyManagerLevel["PIN"] = "PIN";
  KeyManagerLevel["FINGERPRINT"] = "FINGERPRINT";
  KeyManagerLevel["LOCAL"] = "LOCAL";
  KeyManagerLevel["BROWSER_LOCAL_STORAGE"] = "BROWSER_LOCAL_STORAGE";
  KeyManagerLevel["BROWSER_SESSION_STORAGE"] = "BROWSER_SESSION_STORAGE";
})(exports.KeyManagerLevel || (exports.KeyManagerLevel = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (KeyManagerLevel) {
  /*
   * Returns the index of the enum value
   *
   * @param value The level to get the index of
   */
  function indexFor(value) {
    return Object.keys(KeyManagerLevel).indexOf(value);
  }
  KeyManagerLevel.indexFor = indexFor;
  /*
   * Creates an AuthenticatorLevel from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = KeyManagerLevel.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(KeyManagerLevel)[index];
  }
  KeyManagerLevel.from = from;
})(exports.KeyManagerLevel || (exports.KeyManagerLevel = {}));

/**
 * A proxy handler that will create magic getters and setters for the storage
 */
var storageProxyHandler = {
  /**
   * return the called property from the storage if it exists
   * @param target - The target object
   * @param key - The property key
   * @returns The value of the property from the storage or cached value
   * @throws {Error} If the data could not be retrieved
   */
  get: function get(target, key) {
    if (key === 'scope') throwError('Scope is a reserved key');
    if (key === 'cache') throwError('Cache is a reserved key');
    var scopedKey = target.scope + key;
    if (key in target) {
      if (key === 'clear') {
        target.cache = {};
      }
      return function () {
        target[key]();
      };
    }
    if (target.cache[scopedKey]) return target.cache[scopedKey];
    return target.retrieve(scopedKey).then(function (data) {
      target.cache[scopedKey] = data; // cache the data
      return data;
    })["catch"](function (e) {
      throwError("Could not get " + scopedKey + " from storage - " + e);
    });
  },
  /**
   * store the value in the storage
   * @param target - The target object
   * @param key - The property key
   * @param value - The value to store
   * @returns true if the value was stored
   * @throws {Error} If the data could not be stored
   */
  set: /*#__PURE__*/function () {
    var _set = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(target, key, value) {
      var scopedKey;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            scopedKey = target.scope + key;
            return _context.abrupt("return", target.store(scopedKey, value).then(function () {
              target.cache[scopedKey] = value;
              return true;
            })["catch"](function () {
              return false;
              // throw new Error(`Could not store data - ${e}`);
            }));
          case 2:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function set(_x, _x2, _x3) {
      return _set.apply(this, arguments);
    }
    return set;
  }()
};
function createStorage(scope, storageFactory) {
  var storage = storageFactory(scope);
  storage.cache = {};
  var proxy = new Proxy(storage, storageProxyHandler);
  return proxy;
}

var secp256k1 = /*#__PURE__*/new elliptic.ec('secp256k1');
function randomBytes(bytes) {
  return rb(new Uint8Array(bytes));
}
function validateKey(keyPair) {
  var result = keyPair.validate();
  if (!result.result) {
    throwError("Key not valid with reason " + result.reason, exports.SdkErrors.InvalidKey);
  }
}
function toElliptic(key) {
  var ecKeyPair;
  if (key instanceof eosio.PublicKey) {
    ecKeyPair = secp256k1.keyFromPublic(key.data.array);
  } else {
    ecKeyPair = secp256k1.keyFromPrivate(key.data.array);
  }
  validateKey(ecKeyPair);
  return ecKeyPair;
}
function randomString(bytes) {
  var random = rb(new Uint8Array(bytes));
  return Array.from(random).map(int2hex).join('');
}
function sha256(digest) {
  return eosio.Checksum256.hash(eosio.Bytes.from(encodeHex(digest), 'hex')).toString();
}
function int2hex(i) {
  return ('0' + i.toString(16)).slice(-2);
}
function encodeHex(str) {
  return str.split('').map(function (c) {
    return c.charCodeAt(0).toString(16).padStart(2, '0');
  }).join('');
}
function decodeHex(hex) {
  return hex.split(/(\w\w)/g).filter(function (p) {
    return !!p;
  }).map(function (c) {
    return String.fromCharCode(parseInt(c, 16));
  }).join('');
}
function generateRandomKeyPair() {
  var bytes = randomBytes(32);
  var privateKey = new eosio.PrivateKey(eosio.KeyType.K1, new eosio.Bytes(bytes));
  var publicKey = privateKey.toPublic();
  return {
    privateKey: privateKey,
    publicKey: publicKey
  };
}
function createVCSigner(keyManager, level) {
  return {
    sign: function sign(data) {
      return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return keyManager.signData({
                level: level,
                data: data,
                outputType: 'jwt'
              });
            case 2:
              return _context.abrupt("return", _context.sent);
            case 3:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }))();
    }
  };
}

(function (AccountType) {
  AccountType["PERSON"] = "PERSON";
  AccountType["ORG"] = "ORG";
  AccountType["APP"] = "APP";
  AccountType["GOV"] = "GOV";
})(exports.AccountType || (exports.AccountType = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (AccountType) {
  /*
   * Returns the index of the enum value
   *
   * @param value The level to get the index of
   */
  function indexFor(value) {
    return Object.keys(AccountType).indexOf(value);
  }
  AccountType.indexFor = indexFor;
  /*
   * Creates an AccountType from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = AccountType.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(AccountType)[index];
  }
  AccountType.from = from;
  function getPreSuffix(value) {
    return value.toLowerCase();
  }
  AccountType.getPreSuffix = getPreSuffix;
})(exports.AccountType || (exports.AccountType = {}));
var TonomyUsername = /*#__PURE__*/function () {
  function TonomyUsername(username, hashed) {
    if (hashed === void 0) {
      hashed = false;
    }
    if (hashed) {
      this.usernameHash = username;
    } else {
      this.username = username;
      this.usernameHash = sha256(this.username);
    }
  }
  TonomyUsername.fromHash = function fromHash(usernameHash) {
    return new TonomyUsername(usernameHash, true);
  };
  TonomyUsername.fromUsername = function fromUsername(username, type, suffix) {
    var fullUsername = username + '.' + exports.AccountType.getPreSuffix(type) + suffix;
    return new TonomyUsername(fullUsername);
  };
  TonomyUsername.fromFullUsername = function fromFullUsername(username) {
    return new TonomyUsername(username);
  };
  var _proto = TonomyUsername.prototype;
  _proto.getBaseUsername = function getBaseUsername() {
    var _this$username;
    return (_this$username = this.username) == null ? void 0 : _this$username.split('.')[0];
  };
  return TonomyUsername;
}();

var PermissionLevel;
(function (PermissionLevel) {
  PermissionLevel["OWNER"] = "OWNER";
  PermissionLevel["ACTIVE"] = "ACTIVE";
  PermissionLevel["PASSWORD"] = "PASSWORD";
  PermissionLevel["PIN"] = "PIN";
  PermissionLevel["FINGERPRINT"] = "FINGERPRINT";
  PermissionLevel["LOCAL"] = "LOCAL";
})(PermissionLevel || (PermissionLevel = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (PermissionLevel) {
  /*
   * Returns the index of the enum value
   *
   * @param value The value to get the index of
   */
  function indexFor(value) {
    return Object.keys(PermissionLevel).indexOf(value);
  }
  PermissionLevel.indexFor = indexFor;
  /*
   * Creates an PermissionLevel from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = PermissionLevel.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(PermissionLevel)[index];
  }
  PermissionLevel.from = from;
})(PermissionLevel || (PermissionLevel = {}));
var IDContract = /*#__PURE__*/function () {
  function IDContract() {}
  var _proto = IDContract.prototype;
  _proto.newperson = /*#__PURE__*/function () {
    var _newperson = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(username_hash, password_key, password_salt, signer) {
      var action;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            action = {
              authorization: [{
                actor: 'id.tonomy',
                permission: 'active'
              }],
              account: 'id.tonomy',
              name: 'newperson',
              data: {
                username_hash: username_hash,
                password_key: password_key,
                password_salt: password_salt
              }
            };
            _context.next = 3;
            return transact(eosio.Name.from('id.tonomy'), [action], signer);
          case 3:
            return _context.abrupt("return", _context.sent);
          case 4:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function newperson(_x, _x2, _x3, _x4) {
      return _newperson.apply(this, arguments);
    }
    return newperson;
  }();
  _proto.updatekeysper = /*#__PURE__*/function () {
    var _updatekeysper = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(account, keys, signer) {
      var actions, key, permission, publicKey;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            actions = [];
            if (Object.keys(keys).length === 0) throwError('At least one key must be provided', exports.SdkErrors.UpdateKeysTransactionNoKeys);
            for (key in keys) {
              permission = PermissionLevel.from(key); // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
              publicKey = keys[key];
              actions.push({
                authorization: [{
                  actor: account,
                  permission: 'active'
                }],
                account: 'id.tonomy',
                name: 'updatekeyper',
                data: {
                  account: account,
                  permission: PermissionLevel.indexFor(permission),
                  key: publicKey
                }
              });
            }
            _context2.next = 5;
            return transact(eosio.Name.from('id.tonomy'), actions, signer);
          case 5:
            return _context2.abrupt("return", _context2.sent);
          case 6:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function updatekeysper(_x5, _x6, _x7) {
      return _updatekeysper.apply(this, arguments);
    }
    return updatekeysper;
  }();
  _proto.newapp = /*#__PURE__*/function () {
    var _newapp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(app_name, description, username_hash, logo_url, origin, key, signer) {
      var action;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            /^(((http:\/\/)|(https:\/\/))?)(([a-zA-Z0-9.])+)((:{1}[0-9]+)?)$/g.test(origin);
            /^(((http:\/\/)|(https:\/\/))?)(([a-zA-Z0-9.])+)((:{1}[0-9]+)?)([?#/a-zA-Z0-9.]*)$/g.test(logo_url);
            action = {
              authorization: [{
                actor: 'id.tonomy',
                permission: 'active'
              }],
              account: 'id.tonomy',
              name: 'newapp',
              data: {
                app_name: app_name,
                description: description,
                logo_url: logo_url,
                origin: origin,
                username_hash: username_hash,
                key: key
              }
            };
            _context3.next = 5;
            return transact(eosio.Name.from('id.tonomy'), [action], signer);
          case 5:
            return _context3.abrupt("return", _context3.sent);
          case 6:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    }));
    function newapp(_x8, _x9, _x10, _x11, _x12, _x13, _x14) {
      return _newapp.apply(this, arguments);
    }
    return newapp;
  }();
  _proto.loginwithapp = /*#__PURE__*/function () {
    var _loginwithapp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(account, app, parent, key, signer) {
      var action;
      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            action = {
              authorization: [{
                actor: account,
                permission: parent
              }],
              account: 'id.tonomy',
              name: 'loginwithapp',
              data: {
                account: account,
                app: app,
                parent: parent,
                key: key
              }
            };
            _context4.next = 3;
            return transact(eosio.Name.from('id.tonomy'), [action], signer);
          case 3:
            return _context4.abrupt("return", _context4.sent);
          case 4:
          case "end":
            return _context4.stop();
        }
      }, _callee4);
    }));
    function loginwithapp(_x15, _x16, _x17, _x18, _x19) {
      return _loginwithapp.apply(this, arguments);
    }
    return loginwithapp;
  }();
  _proto.getPerson = /*#__PURE__*/function () {
    var _getPerson = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(account) {
      var data, api, usernameHash, idData;
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return getApi();
          case 2:
            api = _context5.sent;
            if (!(account instanceof TonomyUsername)) {
              _context5.next = 12;
              break;
            }
            // this is a username
            usernameHash = account.usernameHash;
            _context5.next = 7;
            return api.v1.chain.get_table_rows({
              code: 'id.tonomy',
              scope: 'id.tonomy',
              table: 'people',
              // eslint-disable-next-line camelcase
              lower_bound: eosio.Checksum256.from(usernameHash),
              limit: 1,
              // eslint-disable-next-line camelcase
              index_position: 'secondary'
            });
          case 7:
            data = _context5.sent;
            if (!data || !data.rows) throwError('No data found', exports.SdkErrors.DataQueryNoRowDataFound);
            if (data.rows.length === 0 || data.rows[0].username_hash.toString() !== usernameHash) {
              throwError('Person with username "' + account.username + '" not found', exports.SdkErrors.UsernameNotFound);
            }
            _context5.next = 17;
            break;
          case 12:
            _context5.next = 14;
            return api.v1.chain.get_table_rows({
              code: 'id.tonomy',
              scope: 'id.tonomy',
              table: 'people',
              // eslint-disable-next-line camelcase
              lower_bound: account,
              limit: 1
            });
          case 14:
            data = _context5.sent;
            if (!data || !data.rows) throwError('No data found', exports.SdkErrors.DataQueryNoRowDataFound);
            if (data.rows.length === 0 || data.rows[0].account_name !== account.toString()) {
              throwError('Person with account name "' + account.toString() + '" not found', exports.SdkErrors.AccountDoesntExist);
            }
          case 17:
            idData = data.rows[0];
            return _context5.abrupt("return", {
              // eslint-disable-next-line camelcase
              account_name: eosio.Name.from(idData.account_name),
              status: idData.status,
              // eslint-disable-next-line camelcase
              username_hash: eosio.Checksum256.from(idData.username_hash),
              // eslint-disable-next-line camelcase
              password_salt: eosio.Checksum256.from(idData.password_salt),
              version: idData.version
            });
          case 19:
          case "end":
            return _context5.stop();
        }
      }, _callee5);
    }));
    function getPerson(_x20) {
      return _getPerson.apply(this, arguments);
    }
    return getPerson;
  }();
  _proto.getApp = /*#__PURE__*/function () {
    var _getApp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(account) {
      var data, api, usernameHash, origin, originHash, idData;
      return _regeneratorRuntime().wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return getApi();
          case 2:
            api = _context6.sent;
            if (!(account instanceof TonomyUsername)) {
              _context6.next = 12;
              break;
            }
            // this is a username
            usernameHash = account.usernameHash;
            _context6.next = 7;
            return api.v1.chain.get_table_rows({
              code: 'id.tonomy',
              scope: 'id.tonomy',
              table: 'apps',
              // eslint-disable-next-line camelcase
              lower_bound: eosio.Checksum256.from(usernameHash),
              limit: 1,
              // eslint-disable-next-line camelcase
              index_position: 'secondary'
            });
          case 7:
            data = _context6.sent;
            if (!data || !data.rows) throwError('No data found', exports.SdkErrors.DataQueryNoRowDataFound);
            if (data.rows.length === 0 || data.rows[0].username_hash.toString() !== usernameHash) {
              throwError('Account with username "' + account.username + '" not found', exports.SdkErrors.UsernameNotFound);
            }
            _context6.next = 27;
            break;
          case 12:
            if (!(account instanceof eosio.Name)) {
              _context6.next = 20;
              break;
            }
            _context6.next = 15;
            return api.v1.chain.get_table_rows({
              code: 'id.tonomy',
              scope: 'id.tonomy',
              table: 'apps',
              // eslint-disable-next-line camelcase
              lower_bound: account,
              limit: 1
            });
          case 15:
            data = _context6.sent;
            if (!data || !data.rows) throwError('No data found', exports.SdkErrors.DataQueryNoRowDataFound);
            if (data.rows.length === 0 || data.rows[0].account_name !== account.toString()) {
              throwError('Account "' + account.toString() + '" not found', exports.SdkErrors.AccountDoesntExist);
            }
            _context6.next = 27;
            break;
          case 20:
            // account is the origin
            origin = account;
            originHash = sha256(origin);
            _context6.next = 24;
            return api.v1.chain.get_table_rows({
              code: 'id.tonomy',
              scope: 'id.tonomy',
              table: 'apps',
              // eslint-disable-next-line camelcase
              lower_bound: eosio.Checksum256.from(originHash),
              limit: 1,
              // eslint-disable-next-line camelcase
              index_position: 'tertiary'
            });
          case 24:
            data = _context6.sent;
            if (!data || !data.rows) throwError('No data found', exports.SdkErrors.DataQueryNoRowDataFound);
            if (data.rows.length === 0 || data.rows[0].origin !== origin) {
              throwError('Account with origin "' + origin + '" not found', exports.SdkErrors.OriginNotFound);
            }
          case 27:
            idData = data.rows[0];
            return _context6.abrupt("return", {
              // eslint-disable-next-line camelcase
              app_name: idData.app_name,
              description: idData.description,
              // eslint-disable-next-line camelcase
              logo_url: idData.logo_url,
              origin: idData.origin,
              // eslint-disable-next-line camelcase
              account_name: eosio.Name.from(idData.account_name),
              // eslint-disable-next-line camelcase
              username_hash: eosio.Checksum256.from(idData.username_hash),
              version: idData.version
            });
          case 29:
          case "end":
            return _context6.stop();
        }
      }, _callee6);
    }));
    function getApp(_x21) {
      return _getApp.apply(this, arguments);
    }
    return getApp;
  }();
  _createClass(IDContract, null, [{
    key: "Instance",
    get: function get() {
      return this.singletonInstance || (this.singletonInstance = new this());
    }
  }]);
  return IDContract;
}();

// https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/10-million-password-list-top-100.txt
var top100Passwords = ['123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football', 'monkey', 'letmein', '696969', 'shadow', 'master', '666666', 'qwertyuiop', '123321', 'mustang', '1234567890', 'michael', '654321', 'pussy', 'superman', '1qaz2wsx', '7777777', 'fuckyou', '121212',
//    '0',
'qazwsx', '123qwe', 'killer', 'trustno1', 'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter', 'buster', 'soccer', 'harley', 'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou', 'fuckme', '2000', 'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel', 'starwars', 'klaster', '112233', 'george', 'asshole', 'computer', 'michelle', 'jessica', 'pepper', '1111', 'zxcvbn', '555555', '11111111', '131313', 'freedom', '777777', 'pass', 'fuck', 'maggie', '159753', 'aaaaaa', 'ginger', 'princess', 'joshua', 'cheese', 'amanda', 'summer', 'love', 'ashley', '6969', 'nicole', 'chelsea', 'biteme', 'matthew', 'access', 'yankees', '987654321', 'dallas', 'austin', 'thunder', 'taylor', 'matrix', 'minecraft'];

function validatePassword(masterPassword) {
  var normalizedPassword = masterPassword.normalize('NFKC');
  // minimum 12 characters
  // at least 1 lowercase, 1 uppercase, 1 number
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(normalizedPassword)) {
    throwError('Password is invalid', exports.SdkErrors.PasswordFormatInvalid);
  }
  for (var _iterator = _createForOfIteratorHelperLoose(top100Passwords), _step; !(_step = _iterator()).done;) {
    var password = _step.value;
    if (normalizedPassword.toLowerCase().includes(password)) throwError('Password contains words or phrases that are too common', exports.SdkErrors.PasswordTooCommon);
  }
  return normalizedPassword;
}

var idContract = IDContract.Instance;

(function (AppStatus) {
  AppStatus["PENDING"] = "PENDING";
  AppStatus["CREATING"] = "CREATING";
  AppStatus["READY"] = "READY";
  AppStatus["DEACTIVATED"] = "DEACTIVATED";
})(exports.AppStatus || (exports.AppStatus = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (AppStatus) {
  /*
   * Returns the index of the enum value
   *
   * @param value The level to get the index of
   */
  function indexFor(value) {
    return Object.keys(AppStatus).indexOf(value);
  }
  AppStatus.indexFor = indexFor;
  /*
   * Creates an AppStatus from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = AppStatus.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(AppStatus)[index];
  }
  AppStatus.from = from;
})(exports.AppStatus || (exports.AppStatus = {}));
var App = /*#__PURE__*/function () {
  function App(options) {
    this.accountName = options.accountName;
    this.appName = options.appName;
    this.username = options.username;
    this.description = options.description;
    this.logoUrl = options.logoUrl;
    this.origin = options.origin;
    this.version = options.version;
    this.status = options.status;
  }
  App.create = /*#__PURE__*/function () {
    var _create = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(options) {
      var username, privateKey, res, newAccountAction;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            username = TonomyUsername.fromUsername(options.usernamePrefix, exports.AccountType.APP, getSettings().accountSuffix); // TODO remove this
            privateKey = eosio.PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
            _context.next = 4;
            return idContract.newapp(options.appName, options.description, username.usernameHash, options.logoUrl, options.origin, options.publicKey, createSigner(privateKey));
          case 4:
            res = _context.sent;
            newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
            return _context.abrupt("return", new App(_extends({}, options, {
              accountName: eosio.Name.from(newAccountAction.data.name),
              username: username,
              version: newAccountAction.data.version,
              status: exports.AppStatus.READY
            })));
          case 7:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function create(_x) {
      return _create.apply(this, arguments);
    }
    return create;
  }();
  App.getApp = /*#__PURE__*/function () {
    var _getApp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(origin) {
      var contractAppData;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return idContract.getApp(origin);
          case 2:
            contractAppData = _context2.sent;
            return _context2.abrupt("return", new App({
              accountName: contractAppData.account_name,
              appName: contractAppData.app_name,
              username: TonomyUsername.fromHash(contractAppData.username_hash.toString()),
              description: contractAppData.description,
              logoUrl: contractAppData.logo_url,
              origin: contractAppData.origin,
              version: contractAppData.version,
              status: exports.AppStatus.READY
            }));
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function getApp(_x2) {
      return _getApp.apply(this, arguments);
    }
    return getApp;
  }();
  return App;
}();

// Inspired by https://github.com/davidchambers/Base64.js/blob/master/base64.js
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var Base64 = {
  btoa: function btoa(input) {
    if (input === void 0) {
      input = '';
    }
    var str = input;
    var output = '';
    for (var block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3 / 4);
      if (charCode > 0xff) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  },
  atob: function atob(input) {
    if (input === void 0) {
      input = '';
    }
    var str = input.replace(/=+$/, '');
    var output = '';
    if (str.length % 4 === 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (var bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  }
};
// Polyfill for React Native which does not have Buffer, or atob/btoa
// TODO maybe do this at global level?
if (typeof Buffer === 'undefined') {
  if (typeof window === 'undefined' || typeof window.atob === 'undefined') {
    window.atob = Base64.atob;
    window.btoa = Base64.btoa;
  }
}
function bnToBase64Url(bn) {
  if (typeof Buffer !== 'undefined') {
    // nodejs
    var buffer = bn.toArrayLike(Buffer, 'be');
    return Buffer.from(buffer).toString('base64');
  } else {
    // browser
    return hexToBase64(bn.toString('hex'));
  }
}
function hexToBase64(hexstring) {
  return window.btoa(hexstring.match(/\w{2}/g).map(function (a) {
    return String.fromCharCode(parseInt(a, 16));
  }).join(''));
}
function utf8ToB64(str) {
  if (typeof Buffer !== 'undefined') {
    // nodejs
    return Buffer.from(str).toString('base64');
  } else {
    // browser
    return window.btoa(unescape(encodeURIComponent(str)));
  }
}
function b64ToUtf8(str) {
  if (typeof Buffer !== 'undefined') {
    // nodejs
    return Buffer.from(str, 'base64').toString('utf8');
  } else {
    // browser
    return decodeURIComponent(escape(window.atob(str)));
  }
}

var _excluded = ["d", "p", "q", "dp", "dq", "qi"],
  _excluded2 = ["d", "p", "q", "dp", "dq", "qi", "key_ops"];
function createJWK(publicKey) {
  var ecPubKey = toElliptic(publicKey);
  var publicKeyJwk = {
    crv: 'secp256k1',
    kty: 'EC',
    x: bnToBase64Url(ecPubKey.getPublic().getX()),
    y: bnToBase64Url(ecPubKey.getPublic().getY()),
    kid: publicKey.toString()
  };
  return publicKeyJwk;
}
// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L120
function toDid(jwk) {
  // eslint-disable-next-line no-unused-vars
  var publicKeyJwk = _objectWithoutPropertiesLoose(jwk, _excluded);
  // TODO replace with base64url encoder for web
  var id = utf8ToB64(JSON.stringify(publicKeyJwk));
  var did = "did:jwk:" + id;
  return did;
}
// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L128
function toDidDocument(jwk) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var getPublicOperationsFromPrivate = function getPublicOperationsFromPrivate(keyOps) {
    if (keyOps.includes('sign')) {
      return ['verify'];
    }
    if (keyOps.includes('verify')) {
      return ['encrypt'];
    }
    return keyOps;
  };
  var d = jwk.d,
    key_ops = jwk.key_ops,
    publicKeyJwk = _objectWithoutPropertiesLoose(jwk, _excluded2);
  // eslint-disable-next-line camelcase
  if (d && key_ops) {
    // eslint-disable-next-line camelcase
    publicKeyJwk.key_ops = getPublicOperationsFromPrivate(key_ops);
  }
  var did = toDid(publicKeyJwk);
  var vm = {
    id: '#0',
    type: 'JsonWebKey2020',
    controller: did,
    publicKeyJwk: publicKeyJwk
  };
  var didDocument = {
    '@context': ['https://www.w3.org/ns/did/v1', {
      '@vocab': 'https://www.iana.org/assignments/jose#'
    }],
    id: did,
    verificationMethod: [vm]
  };
  return didDocument;
}
// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L177
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(did, options) {
  var decoded = b64ToUtf8(did.split(':').pop().split('#')[0]);
  var jwk = JSON.parse(decoded.toString());
  return toDidDocument(jwk);
}

var Message = /*#__PURE__*/function () {
  function Message(jwt) {
    this.jwt = jwt;
    this.decodedJwt = didJwt.decodeJWT(jwt);
    this.jwt = jwt;
  }
  /**
   * creates a signed message and return message object
   * @param message the messageResolver with the signer and the did
   * @param recipient the recipient id
   * @returns a message objects
   */
  Message.sign =
  /*#__PURE__*/
  function () {
    var _sign = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(message, issuer, recipient) {
      var vc, result;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            vc = {
              '@context': ['https://www.w3.org/2018/credentials/v1'],
              id: 'https://example.com/id/1234324',
              type: ['VerifiableCredential'],
              issuer: {
                id: issuer.did
              },
              issuanceDate: new Date().toISOString(),
              credentialSubject: {
                message: message
              }
            }; // add recipient to vc if given
            if (recipient) vc.credentialSubject.id = recipient;
            _context.next = 4;
            return antelopeSsiToolkit.issue(vc, {
              issuer: issuer,
              outputType: antelopeSsiToolkit.OutputType.JWT
            });
          case 4:
            result = _context.sent;
            return _context.abrupt("return", new Message(result));
          case 6:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function sign(_x, _x2, _x3) {
      return _sign.apply(this, arguments);
    }
    return sign;
  }() // Returns the sender of the message (iss property of the signed VC)
  ;
  var _proto = Message.prototype;
  _proto.getSender = function getSender() {
    return this.decodedJwt.payload.iss;
  }
  // Returns the recipient of the message (sub property of the signed VC)
  ;
  _proto.getRecipient = function getRecipient() {
    return this.decodedJwt.payload.sub;
  }
  // Returns the original unsigned payload
  ;
  _proto.getPayload = function getPayload() {
    return this.decodedJwt.payload.vc.credentialSubject.message;
  }
  // // Returns the message type (ignores VerifiableCredential type). This is used to determine what kind of message it is (login request, login request confirmation etc...) so the client can choose what to do with it
  // getType(): string {}
  /* Verifies the VC. True if valid
   * this is setup to resolve did:antelope and did:jwk DIDs
   */;
  _proto.verify =
  /*#__PURE__*/
  function () {
    var _verify = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      var settings, jwkResolver, resolver, result;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            settings = getSettings(); //TODO: use compatible resolver for the didjwk resolver
            jwkResolver = {
              resolve: resolve
            }; // const resolver = {
            //     resolve: new AntelopeDID({ fetch: crossFetch, antelopeChainUrl: settings.blockchainUrl }).resolve,
            // };
            resolver = new didResolver.Resolver(_extends({}, antelopeDidResolver.getResolver({
              antelopeChainUrl: settings.blockchainUrl,
              fetch: fetch
            })));
            _context2.prev = 3;
            _context2.next = 6;
            return Promise.any([didJwtVc.verifyCredential(this.jwt, {
              resolve: jwkResolver.resolve
            }), didJwtVc.verifyCredential(this.jwt, resolver)]);
          case 6:
            result = _context2.sent;
            return _context2.abrupt("return", result.verified);
          case 10:
            _context2.prev = 10;
            _context2.t0 = _context2["catch"](3);
            return _context2.abrupt("return", false);
          case 13:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this, [[3, 10]]);
    }));
    function verify() {
      return _verify.apply(this, arguments);
    }
    return verify;
  }();
  return Message;
}();

var idContract$1 = IDContract.Instance;
var UserApps = /*#__PURE__*/function () {
  function UserApps(_user, _keyManager, storageFactory) {
    this.user = _user;
    this.keyManager = _keyManager;
    this.storage = createStorage('tonomy.user.apps.', storageFactory);
  }
  var _proto = UserApps.prototype;
  _proto.loginWithApp = /*#__PURE__*/function () {
    var _loginWithApp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(app, key) {
      var myAccount, appRecord, apps, signer;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return this.user.storage.accountName;
          case 2:
            myAccount = _context.sent;
            appRecord = {
              app: app,
              added: new Date(),
              status: exports.AppStatus.PENDING
            };
            _context.next = 6;
            return this.storage.appRecords;
          case 6:
            apps = _context.sent;
            if (!apps) {
              apps = [];
            }
            apps.push(appRecord);
            this.storage.appRecords = apps;
            _context.next = 12;
            return this.storage.appRecords;
          case 12:
            signer = createKeyManagerSigner(this.keyManager, exports.KeyManagerLevel.LOCAL);
            _context.next = 15;
            return idContract$1.loginwithapp(myAccount.toString(), app.accountName.toString(), 'local', key, signer);
          case 15:
            appRecord.status = exports.AppStatus.READY;
            this.storage.appRecords = apps;
            _context.next = 19;
            return this.storage.appRecords;
          case 19:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function loginWithApp(_x, _x2) {
      return _loginWithApp.apply(this, arguments);
    }
    return loginWithApp;
  }()
  /**
   * Verifies the login request are valid requests signed by valid DIDs
   *
   * @param requests {string | null} - a stringified array of JWTs
   * @returns {Promise<Message[]>} - an array of verified messages containing the login requests
   */
  ;
  UserApps.verifyRequests =
  /*#__PURE__*/
  function () {
    var _verifyRequests = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(requests) {
      var jwtRequests, verified, _iterator, _step, jwt;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (!requests) throwError('No requests found in URL', exports.SdkErrors.MissingParams);
            jwtRequests = JSON.parse(requests);
            if (!jwtRequests || !Array.isArray(jwtRequests) || jwtRequests.length === 0) {
              throwError('No JWTs found in URL', exports.SdkErrors.MissingParams);
            }
            verified = [];
            _iterator = _createForOfIteratorHelperLoose(jwtRequests);
          case 5:
            if ((_step = _iterator()).done) {
              _context2.next = 14;
              break;
            }
            jwt = _step.value;
            _context2.t0 = verified;
            _context2.next = 10;
            return this.verifyLoginJWT(jwt);
          case 10:
            _context2.t1 = _context2.sent;
            _context2.t0.push.call(_context2.t0, _context2.t1);
          case 12:
            _context2.next = 5;
            break;
          case 14:
            return _context2.abrupt("return", verified);
          case 15:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function verifyRequests(_x3) {
      return _verifyRequests.apply(this, arguments);
    }
    return verifyRequests;
  }()
  /**
   * Extracts the login requests, username and accountName from the URL
   *
   * @returns the requests (JWTs), username and accountName
   */
  ;
  UserApps.getLoginRequestParams = function getLoginRequestParams() {
    var params = new URLSearchParams(window.location.search);
    var requests = params.get('requests');
    if (!requests) throwError("requests parameter doesn't exists", exports.SdkErrors.MissingParams);
    var username = params.get('username');
    if (!username) throwError("username parameter doesn't exists", exports.SdkErrors.MissingParams);
    var accountName = params.get('accountName');
    if (!accountName) throwError("accountName parameter doesn't exists", exports.SdkErrors.MissingParams);
    return {
      requests: requests,
      username: username,
      accountName: accountName
    };
  }
  /**
   * Verifies the login request received in the URL were successfully authorized by Tonomy ID
   *
   * @description should be called in the callback page of the SSO Login website
   *
   * @returns {Promise<Message>} - the verified login request
   */;
  UserApps.onRedirectLogin =
  /*#__PURE__*/
  function () {
    var _onRedirectLogin = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      var urlParams, requests, verifiedRequests, referrer, _iterator2, _step2, message;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            urlParams = new URLSearchParams(window.location.search);
            requests = urlParams.get('requests');
            _context3.next = 4;
            return UserApps.verifyRequests(requests);
          case 4:
            verifiedRequests = _context3.sent;
            referrer = new URL(document.referrer);
            _iterator2 = _createForOfIteratorHelperLoose(verifiedRequests);
          case 7:
            if ((_step2 = _iterator2()).done) {
              _context3.next = 13;
              break;
            }
            message = _step2.value;
            if (!(message.getPayload().origin === referrer.origin)) {
              _context3.next = 11;
              break;
            }
            return _context3.abrupt("return", message);
          case 11:
            _context3.next = 7;
            break;
          case 13:
            throwError("No origins from: " + verifiedRequests.map(function (r) {
              return r.getPayload().origin;
            }) + " match referrer: " + referrer.origin, exports.SdkErrors.WrongOrigin);
          case 14:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    }));
    function onRedirectLogin() {
      return _onRedirectLogin.apply(this, arguments);
    }
    return onRedirectLogin;
  }()
  /**
   * Checks that a key exists in the key manager that has been authorized on the DID
   *
   * @description This is called on the callback page to verify that the user has logged in correctly
   *
   * @param accountName {string} - the account name to check the key on
   * @param keyManager {KeyManager} - the key manager to check the key in
   * @param keyManagerLevel {KeyManagerLevel=BROWSER_LOCAL_STORAGE} - the level to check the key in
   * @returns {Promise<boolean>} - true if the key exists and is authorized, false otherwise
   */
  ;
  UserApps.verifyKeyExistsForApp =
  /*#__PURE__*/
  function () {
    var _verifyKeyExistsForApp = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(accountName, keyManager, keyManagerLevel) {
      var pubKey, account, app, publickey;
      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            if (keyManagerLevel === void 0) {
              keyManagerLevel = exports.KeyManagerLevel.BROWSER_LOCAL_STORAGE;
            }
            _context4.next = 3;
            return keyManager.getKey({
              level: keyManagerLevel
            });
          case 3:
            pubKey = _context4.sent;
            if (pubKey) {
              _context4.next = 6;
              break;
            }
            throw throwError('key not found', exports.SdkErrors.KeyNotFound);
          case 6:
            _context4.next = 8;
            return User.getAccountInfo(eosio.Name.from(accountName));
          case 8:
            account = _context4.sent;
            if (!account) throwError("couldn't fetch account", exports.SdkErrors.AccountNotFound);
            _context4.next = 12;
            return App.getApp(window.location.origin);
          case 12:
            app = _context4.sent;
            publickey = account.getPermission(app.accountName).required_auth.keys[0].key;
            return _context4.abrupt("return", pubKey.toString() === publickey.toString());
          case 15:
          case "end":
            return _context4.stop();
        }
      }, _callee4);
    }));
    function verifyKeyExistsForApp(_x4, _x5, _x6) {
      return _verifyKeyExistsForApp.apply(this, arguments);
    }
    return verifyKeyExistsForApp;
  }()
  /**
   * Verifies a jwt string is a valid message with signature from a DID
   * @param jwt {string} - the jwt string to verify
   * @returns {Promise<Message>} - the verified message
   */
  ;
  UserApps.verifyLoginJWT =
  /*#__PURE__*/
  function () {
    var _verifyLoginJWT = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(jwt) {
      var message, res;
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            message = new Message(jwt);
            _context5.next = 3;
            return message.verify();
          case 3:
            res = _context5.sent;
            // TODO should check the keys in KeyManager are on the blockchain...
            if (!res) throwError('JWT failed verification', exports.SdkErrors.JwtNotValid);
            return _context5.abrupt("return", message);
          case 6:
          case "end":
            return _context5.stop();
        }
      }, _callee5);
    }));
    function verifyLoginJWT(_x7) {
      return _verifyLoginJWT.apply(this, arguments);
    }
    return verifyLoginJWT;
  }();
  return UserApps;
}();

var Communication = /*#__PURE__*/function () {
  function Communication() {}
  var _proto = Communication.prototype;
  /**
   * Connects to the Tonomy Communication server
   *
   * @returns {Promise<void>}
   * @throws {SdkError} CommunicationNotConnected
   */
  _proto.connect =
  /*#__PURE__*/
  function () {
    var _connect = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      var _this$socketServer,
        _this = this;
      var url;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!((_this$socketServer = this.socketServer) != null && _this$socketServer.connected)) {
              _context.next = 2;
              break;
            }
            return _context.abrupt("return");
          case 2:
            // dont override socket if connected
            url = getSettings().communicationUrl;
            this.socketServer = socket_ioClient.io(url, {
              transports: ['websocket']
            });
            _context.next = 6;
            return new Promise(function (resolve, reject) {
              _this.socketServer.on('connect', function () {
                resolve(true);
                return;
              });
              setTimeout(function () {
                if (_this.socketServer.connected) return;
                reject(createSdkError('Could not connect to Tonomy Communication server', exports.SdkErrors.CommunicationNotConnected));
              }, 5000);
            });
          case 6:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function connect() {
      return _connect.apply(this, arguments);
    }
    return connect;
  }()
  /**
   * Sends a Message object through a websocket connection to the Tonomy Communication server
   *
   * @param {string} event - the name of the event to emit
   * @param {Message} message - the Message object to send
   * @returns {Promise<boolean>} - true if successful and acknowledged by the server
   * @throws {SdkError} - CommunicationTimeout
   */
  ;
  _proto.emitMessage =
  /*#__PURE__*/
  function () {
    var _emitMessage = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(event, message) {
      var _this2 = this;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return new Promise(function (resolve, reject) {
              _this2.socketServer.emit(event, {
                message: message.jwt
              }, function (response) {
                if (response.error) {
                  reject(response);
                }
                resolve(response);
                return;
              });
              setTimeout(function () {
                reject(createSdkError('Connection timed out to Tonomy Communication server', exports.SdkErrors.CommunicationTimeout));
              }, 5000);
            });
          case 2:
            return _context2.abrupt("return", _context2.sent);
          case 3:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function emitMessage(_x, _x2) {
      return _emitMessage.apply(this, arguments);
    }
    return emitMessage;
  }()
  /**
   * connects to the Tonomy Communication server, authenticates with it's DID
   * subscribes to any messages that are sent by `sendMessage` by providing a callback function executed every time a message is received
   * should send a read receipt when messages are received
   * @returns {boolean} - true if successful
   */
  ;
  _proto.login =
  /*#__PURE__*/
  function () {
    var _login = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(authorization) {
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return this.connect();
          case 2:
            _context3.next = 4;
            return this.emitMessage('login', authorization);
          case 4:
            return _context3.abrupt("return", _context3.sent);
          case 5:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function login(_x3) {
      return _login.apply(this, arguments);
    }
    return login;
  }()
  /* sends a message to another DID
   * create a Message object from the message argument
   * the message is used as the `vc` property of a VC signed by the User's key
   */
  ;
  _proto.sendMessage = function sendMessage(message) {
    return this.emitMessage('message', message);
  }
  // function that adds a new subscriber, which is called every time a message is received
  ;
  _proto.subscribeMessage = function subscribeMessage(subscriber) {
    this.socketServer.on('message', subscriber);
  }
  // unsubscribes a function from the receiving a message
  ;
  _proto.unsubscribeMessage = function unsubscribeMessage(subscriber) {
    this.socketServer.off('message', subscriber);
  };
  _proto.disconnect = function disconnect() {
    var _this$socketServer2;
    if ((_this$socketServer2 = this.socketServer) != null && _this$socketServer2.connected) {
      this.socketServer.disconnect();
    }
  };
  return Communication;
}();

(function (UserStatus) {
  UserStatus["CREATING_ACCOUNT"] = "CREATING_ACCOUNT";
  UserStatus["LOGGING_IN"] = "LOGGING_IN";
  UserStatus["READY"] = "READY";
  UserStatus["DEACTIVATED"] = "DEACTIVATED";
})(exports.UserStatus || (exports.UserStatus = {}));
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (UserStatus) {
  /*
   * Returns the index of the enum value
   *
   * @param value The level to get the index of
   */
  function indexFor(value) {
    return Object.keys(UserStatus).indexOf(value);
  }
  UserStatus.indexFor = indexFor;
  /*
   * Creates an AuthenticatorLevel from a string or index of the level
   *
   * @param value The string or index
   */
  function from(value) {
    var index;
    if (typeof value !== 'number') {
      index = UserStatus.indexFor(value);
    } else {
      index = value;
    }
    return Object.values(UserStatus)[index];
  }
  UserStatus.from = from;
})(exports.UserStatus || (exports.UserStatus = {}));
var idContract$2 = IDContract.Instance;
var User = /*#__PURE__*/function () {
  function User(_keyManager, storageFactory) {
    this.keyManager = _keyManager;
    this.storage = createStorage('tonomy.user.', storageFactory);
    this.apps = new UserApps(this, _keyManager, storageFactory);
    //TODO implement dependency inversion
    this.communication = new Communication();
  }
  var _proto = User.prototype;
  _proto.getStatus = /*#__PURE__*/function () {
    var _getStatus = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return this.storage.status;
          case 2:
            return _context.abrupt("return", _context.sent);
          case 3:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function getStatus() {
      return _getStatus.apply(this, arguments);
    }
    return getStatus;
  }();
  _proto.getAccountName = /*#__PURE__*/function () {
    var _getAccountName = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return this.storage.accountName;
          case 2:
            return _context2.abrupt("return", _context2.sent);
          case 3:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function getAccountName() {
      return _getAccountName.apply(this, arguments);
    }
    return getAccountName;
  }();
  _proto.getUsername = /*#__PURE__*/function () {
    var _getUsername = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return this.storage.username;
          case 2:
            return _context3.abrupt("return", _context3.sent);
          case 3:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function getUsername() {
      return _getUsername.apply(this, arguments);
    }
    return getUsername;
  }();
  _proto.getDid = /*#__PURE__*/function () {
    var _getDid = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return this.storage.did;
          case 2:
            return _context4.abrupt("return", _context4.sent);
          case 3:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function getDid() {
      return _getDid.apply(this, arguments);
    }
    return getDid;
  }();
  _proto.saveUsername = /*#__PURE__*/function () {
    var _saveUsername = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(username) {
      var normalizedUsername, user, fullUsername;
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            normalizedUsername = username.normalize('NFKC');
            fullUsername = TonomyUsername.fromUsername(normalizedUsername, exports.AccountType.PERSON, getSettings().accountSuffix);
            _context5.prev = 2;
            _context5.next = 5;
            return User.getAccountInfo(fullUsername);
          case 5:
            user = _context5.sent;
            // Throws error if username is taken
            if (user) throwError('Username is taken', exports.SdkErrors.UsernameTaken);
            _context5.next = 13;
            break;
          case 9:
            _context5.prev = 9;
            _context5.t0 = _context5["catch"](2);
            if (_context5.t0 instanceof SdkError && _context5.t0.code === exports.SdkErrors.UsernameNotFound) {
              _context5.next = 13;
              break;
            }
            throw _context5.t0;
          case 13:
            this.storage.username = fullUsername;
            _context5.next = 16;
            return this.storage.username;
          case 16:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this, [[2, 9]]);
    }));
    function saveUsername(_x) {
      return _saveUsername.apply(this, arguments);
    }
    return saveUsername;
  }();
  _proto.savePassword = /*#__PURE__*/function () {
    var _savePassword = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(masterPassword, options) {
      var password, privateKey, salt, res, _res;
      return _regeneratorRuntime().wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            password = validatePassword(masterPassword);
            if (!(options && options.salt)) {
              _context6.next = 9;
              break;
            }
            salt = options.salt;
            _context6.next = 5;
            return this.keyManager.generatePrivateKeyFromPassword(password, salt);
          case 5:
            res = _context6.sent;
            privateKey = res.privateKey;
            _context6.next = 14;
            break;
          case 9:
            _context6.next = 11;
            return this.keyManager.generatePrivateKeyFromPassword(password);
          case 11:
            _res = _context6.sent;
            privateKey = _res.privateKey;
            salt = _res.salt;
          case 14:
            this.storage.salt = salt;
            _context6.next = 17;
            return this.storage.salt;
          case 17:
            _context6.next = 19;
            return this.keyManager.storeKey({
              level: exports.KeyManagerLevel.PASSWORD,
              privateKey: privateKey,
              challenge: password
            });
          case 19:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function savePassword(_x2, _x3) {
      return _savePassword.apply(this, arguments);
    }
    return savePassword;
  }();
  _proto.savePIN = /*#__PURE__*/function () {
    var _savePIN = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(pin) {
      var privateKey;
      return _regeneratorRuntime().wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            privateKey = this.keyManager.generateRandomPrivateKey();
            _context7.next = 3;
            return this.keyManager.storeKey({
              level: exports.KeyManagerLevel.PIN,
              privateKey: privateKey,
              challenge: pin
            });
          case 3:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function savePIN(_x4) {
      return _savePIN.apply(this, arguments);
    }
    return savePIN;
  }();
  _proto.checkPin = /*#__PURE__*/function () {
    var _checkPin = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8(pin) {
      var pinKey;
      return _regeneratorRuntime().wrap(function _callee8$(_context8) {
        while (1) switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return this.keyManager.checkKey({
              level: exports.KeyManagerLevel.PIN,
              challenge: pin
            });
          case 2:
            pinKey = _context8.sent;
            if (!pinKey) throwError('Pin is incorrect', exports.SdkErrors.PinInValid);
            return _context8.abrupt("return", true);
          case 5:
          case "end":
            return _context8.stop();
        }
      }, _callee8, this);
    }));
    function checkPin(_x5) {
      return _checkPin.apply(this, arguments);
    }
    return checkPin;
  }();
  _proto.saveFingerprint = /*#__PURE__*/function () {
    var _saveFingerprint = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9() {
      var privateKey;
      return _regeneratorRuntime().wrap(function _callee9$(_context9) {
        while (1) switch (_context9.prev = _context9.next) {
          case 0:
            privateKey = this.keyManager.generateRandomPrivateKey();
            _context9.next = 3;
            return this.keyManager.storeKey({
              level: exports.KeyManagerLevel.FINGERPRINT,
              privateKey: privateKey
            });
          case 3:
          case "end":
            return _context9.stop();
        }
      }, _callee9, this);
    }));
    function saveFingerprint() {
      return _saveFingerprint.apply(this, arguments);
    }
    return saveFingerprint;
  }();
  _proto.saveLocal = /*#__PURE__*/function () {
    var _saveLocal = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10() {
      var privateKey;
      return _regeneratorRuntime().wrap(function _callee10$(_context10) {
        while (1) switch (_context10.prev = _context10.next) {
          case 0:
            privateKey = this.keyManager.generateRandomPrivateKey();
            _context10.next = 3;
            return this.keyManager.storeKey({
              level: exports.KeyManagerLevel.LOCAL,
              privateKey: privateKey
            });
          case 3:
          case "end":
            return _context10.stop();
        }
      }, _callee10, this);
    }));
    function saveLocal() {
      return _saveLocal.apply(this, arguments);
    }
    return saveLocal;
  }();
  _proto.createPerson = /*#__PURE__*/function () {
    var _createPerson = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11() {
      var keyManager, username, usernameHash, passwordKey, idTonomyActiveKey, salt, res, newAccountAction;
      return _regeneratorRuntime().wrap(function _callee11$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
            keyManager = this.keyManager;
            _context11.next = 3;
            return this.storage.username;
          case 3:
            username = _context11.sent;
            usernameHash = username.usernameHash;
            _context11.next = 7;
            return keyManager.getKey({
              level: exports.KeyManagerLevel.PASSWORD
            });
          case 7:
            passwordKey = _context11.sent;
            if (!passwordKey) throwError('Password key not found', exports.SdkErrors.KeyNotFound);
            // TODO this needs to change to the actual key used, from settings
            idTonomyActiveKey = eosio.PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
            _context11.next = 12;
            return this.storage.salt;
          case 12:
            salt = _context11.sent;
            _context11.prev = 13;
            _context11.next = 16;
            return idContract$2.newperson(usernameHash.toString(), passwordKey.toString(), salt.toString(), createSigner(idTonomyActiveKey));
          case 16:
            res = _context11.sent;
            _context11.next = 25;
            break;
          case 19:
            _context11.prev = 19;
            _context11.t0 = _context11["catch"](13);
            if (!(_context11.t0 instanceof AntelopePushTransactionError)) {
              _context11.next = 24;
              break;
            }
            if (!(_context11.t0.hasErrorCode(3050003) && _context11.t0.hasTonomyErrorCode('TCON1000'))) {
              _context11.next = 24;
              break;
            }
            throw throwError('Username is taken', exports.SdkErrors.UsernameTaken);
          case 24:
            throw _context11.t0;
          case 25:
            newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
            this.storage.accountName = eosio.Name.from(newAccountAction.data.name);
            _context11.next = 29;
            return this.storage.accountName;
          case 29:
            this.storage.status = exports.UserStatus.CREATING_ACCOUNT;
            _context11.next = 32;
            return this.storage.status;
          case 32:
            _context11.next = 34;
            return this.createDid();
          case 34:
            return _context11.abrupt("return", res);
          case 35:
          case "end":
            return _context11.stop();
        }
      }, _callee11, this, [[13, 19]]);
    }));
    function createPerson() {
      return _createPerson.apply(this, arguments);
    }
    return createPerson;
  }();
  _proto.updateKeys = /*#__PURE__*/function () {
    var _updateKeys = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee12(password) {
      var status, keyManager, pinKey, fingerprintKey, localKey, keys, signer, accountName;
      return _regeneratorRuntime().wrap(function _callee12$(_context12) {
        while (1) switch (_context12.prev = _context12.next) {
          case 0:
            _context12.next = 2;
            return this.getStatus();
          case 2:
            status = _context12.sent;
            if (!(status === exports.UserStatus.DEACTIVATED)) {
              _context12.next = 5;
              break;
            }
            throw new Error("Can't update keys ");
          case 5:
            keyManager = this.keyManager;
            _context12.next = 8;
            return keyManager.getKey({
              level: exports.KeyManagerLevel.PIN
            });
          case 8:
            pinKey = _context12.sent;
            _context12.next = 11;
            return keyManager.getKey({
              level: exports.KeyManagerLevel.FINGERPRINT
            });
          case 11:
            fingerprintKey = _context12.sent;
            _context12.next = 14;
            return keyManager.getKey({
              level: exports.KeyManagerLevel.LOCAL
            });
          case 14:
            localKey = _context12.sent;
            keys = {};
            if (pinKey) keys.PIN = pinKey.toString();
            if (fingerprintKey) keys.FINGERPRINT = fingerprintKey.toString();
            if (localKey) keys.LOCAL = localKey.toString();
            signer = createKeyManagerSigner(keyManager, exports.KeyManagerLevel.PASSWORD, password);
            _context12.next = 22;
            return this.storage.accountName;
          case 22:
            accountName = _context12.sent;
            _context12.next = 25;
            return idContract$2.updatekeysper(accountName.toString(), keys, signer);
          case 25:
            this.storage.status = exports.UserStatus.READY;
            _context12.next = 28;
            return this.storage.status;
          case 28:
          case "end":
            return _context12.stop();
        }
      }, _callee12, this);
    }));
    function updateKeys(_x6) {
      return _updateKeys.apply(this, arguments);
    }
    return updateKeys;
  }();
  _proto.checkPassword = /*#__PURE__*/function () {
    var _checkPassword = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee13(password) {
      var username, idData, salt, passwordKey, accountData, onchainKey;
      return _regeneratorRuntime().wrap(function _callee13$(_context13) {
        while (1) switch (_context13.prev = _context13.next) {
          case 0:
            _context13.next = 2;
            return this.getAccountName();
          case 2:
            username = _context13.sent;
            _context13.next = 5;
            return idContract$2.getPerson(username);
          case 5:
            idData = _context13.sent;
            salt = idData.password_salt;
            _context13.next = 9;
            return this.savePassword(password, {
              salt: salt
            });
          case 9:
            _context13.next = 11;
            return this.keyManager.getKey({
              level: exports.KeyManagerLevel.PASSWORD
            });
          case 11:
            passwordKey = _context13.sent;
            _context13.next = 14;
            return User.getAccountInfo(idData.account_name);
          case 14:
            accountData = _context13.sent;
            onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change
            if (!passwordKey) throwError('Password key not found', exports.SdkErrors.KeyNotFound);
            if (passwordKey.toString() !== onchainKey.toString()) throwError('Password is incorrect', exports.SdkErrors.PasswordInValid);
            return _context13.abrupt("return", true);
          case 19:
          case "end":
            return _context13.stop();
        }
      }, _callee13, this);
    }));
    function checkPassword(_x7) {
      return _checkPassword.apply(this, arguments);
    }
    return checkPassword;
  }();
  _proto.login = /*#__PURE__*/function () {
    var _login = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee14(username, password) {
      var keyManager, idData, salt, passwordKey, accountData, onchainKey;
      return _regeneratorRuntime().wrap(function _callee14$(_context14) {
        while (1) switch (_context14.prev = _context14.next) {
          case 0:
            keyManager = this.keyManager;
            _context14.next = 3;
            return idContract$2.getPerson(username);
          case 3:
            idData = _context14.sent;
            salt = idData.password_salt;
            _context14.next = 7;
            return this.savePassword(password, {
              salt: salt
            });
          case 7:
            _context14.next = 9;
            return keyManager.getKey({
              level: exports.KeyManagerLevel.PASSWORD
            });
          case 9:
            passwordKey = _context14.sent;
            if (!passwordKey) throwError('Password key not found', exports.SdkErrors.KeyNotFound);
            _context14.next = 13;
            return User.getAccountInfo(idData.account_name);
          case 13:
            accountData = _context14.sent;
            onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change
            if (passwordKey.toString() !== onchainKey.toString()) throwError('Password is incorrect', exports.SdkErrors.PasswordInValid);
            this.storage.accountName = eosio.Name.from(idData.account_name);
            this.storage.username = username;
            this.storage.status = exports.UserStatus.LOGGING_IN;
            _context14.next = 21;
            return this.storage.accountName;
          case 21:
            _context14.next = 23;
            return this.storage.username;
          case 23:
            _context14.next = 25;
            return this.storage.status;
          case 25:
            _context14.next = 27;
            return this.createDid();
          case 27:
            return _context14.abrupt("return", idData);
          case 28:
          case "end":
            return _context14.stop();
        }
      }, _callee14, this);
    }));
    function login(_x8, _x9) {
      return _login.apply(this, arguments);
    }
    return login;
  }();
  _proto.checkKeysStillValid = /*#__PURE__*/function () {
    var _checkKeysStillValid = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee15() {
      var accountInfo, checkPairs, _i, _checkPairs, pair, localKey, blockchainPermission;
      return _regeneratorRuntime().wrap(function _callee15$(_context15) {
        while (1) switch (_context15.prev = _context15.next) {
          case 0:
            // Account been created, or has not finished being created yet
            if (this.storage.status !== exports.UserStatus.READY) throwError('User is not ready', exports.SdkErrors.AccountDoesntExist);
            _context15.t0 = User;
            _context15.next = 4;
            return this.storage.accountName;
          case 4:
            _context15.t1 = _context15.sent;
            _context15.next = 7;
            return _context15.t0.getAccountInfo.call(_context15.t0, _context15.t1);
          case 7:
            accountInfo = _context15.sent;
            checkPairs = [{
              level: exports.KeyManagerLevel.PIN,
              permission: 'pin'
            }, {
              level: exports.KeyManagerLevel.FINGERPRINT,
              permission: 'fingerprint'
            }, {
              level: exports.KeyManagerLevel.LOCAL,
              permission: 'local'
            }, {
              level: exports.KeyManagerLevel.PASSWORD,
              permission: 'active'
            }, {
              level: exports.KeyManagerLevel.PASSWORD,
              permission: 'owner'
            }];
            _i = 0, _checkPairs = checkPairs;
          case 10:
            if (!(_i < _checkPairs.length)) {
              _context15.next = 30;
              break;
            }
            pair = _checkPairs[_i];
            localKey = void 0;
            _context15.prev = 13;
            _context15.next = 16;
            return this.keyManager.getKey({
              level: pair.level
            });
          case 16:
            localKey = _context15.sent;
            _context15.next = 22;
            break;
          case 19:
            _context15.prev = 19;
            _context15.t2 = _context15["catch"](13);
            localKey = null;
          case 22:
            blockchainPermission = void 0;
            try {
              blockchainPermission = accountInfo.getPermission(pair.permission);
            } catch (e) {
              blockchainPermission = null;
            }
            if (!localKey && blockchainPermission) {
              // User probably logged into another device and finished create account flow there
              throwError(pair.level + " key was not found in the keyManager, but was found on the blockchain", exports.SdkErrors.KeyNotFound);
            }
            if (localKey && !blockchainPermission) {
              // User probably hasn't finished create account flow yet
              throwError(pair.level + " keys was not found on the blockchain, but was found in the keyManager", exports.SdkErrors.KeyNotFound);
            }
            if (localKey && blockchainPermission && localKey.toString() !== blockchainPermission.required_auth.keys[0].key.toString()) {
              // User has logged in on another device
              throwError(pair.level + " keys do not match", exports.SdkErrors.KeyNotFound);
            }
          case 27:
            _i++;
            _context15.next = 10;
            break;
          case 30:
            return _context15.abrupt("return", true);
          case 31:
          case "end":
            return _context15.stop();
        }
      }, _callee15, this, [[13, 19]]);
    }));
    function checkKeysStillValid() {
      return _checkKeysStillValid.apply(this, arguments);
    }
    return checkKeysStillValid;
  }();
  _proto.logout = /*#__PURE__*/function () {
    var _logout = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee16() {
      return _regeneratorRuntime().wrap(function _callee16$(_context16) {
        while (1) switch (_context16.prev = _context16.next) {
          case 0:
            _context16.next = 2;
            return this.keyManager.removeKey({
              level: exports.KeyManagerLevel.PASSWORD
            });
          case 2:
            _context16.next = 4;
            return this.keyManager.removeKey({
              level: exports.KeyManagerLevel.PIN
            });
          case 4:
            _context16.next = 6;
            return this.keyManager.removeKey({
              level: exports.KeyManagerLevel.FINGERPRINT
            });
          case 6:
            _context16.next = 8;
            return this.keyManager.removeKey({
              level: exports.KeyManagerLevel.LOCAL
            });
          case 8:
            // clear storage data
            this.storage.clear();
            this.communication.disconnect();
          case 10:
          case "end":
            return _context16.stop();
        }
      }, _callee16, this);
    }));
    function logout() {
      return _logout.apply(this, arguments);
    }
    return logout;
  }();
  _proto.isLoggedIn = /*#__PURE__*/function () {
    var _isLoggedIn = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee17() {
      return _regeneratorRuntime().wrap(function _callee17$(_context17) {
        while (1) switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return this.getStatus();
          case 2:
            _context17.t0 = _context17.sent;
            _context17.t1 = exports.UserStatus.READY;
            return _context17.abrupt("return", _context17.t0 === _context17.t1);
          case 5:
          case "end":
            return _context17.stop();
        }
      }, _callee17, this);
    }));
    function isLoggedIn() {
      return _isLoggedIn.apply(this, arguments);
    }
    return isLoggedIn;
  }();
  User.getAccountInfo = /*#__PURE__*/function () {
    var _getAccountInfo = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee18(account) {
      var accountName, api, idData, error;
      return _regeneratorRuntime().wrap(function _callee18$(_context18) {
        while (1) switch (_context18.prev = _context18.next) {
          case 0:
            _context18.prev = 0;
            _context18.next = 3;
            return getApi();
          case 3:
            api = _context18.sent;
            if (!(account instanceof TonomyUsername)) {
              _context18.next = 11;
              break;
            }
            _context18.next = 7;
            return idContract$2.getPerson(account);
          case 7:
            idData = _context18.sent;
            accountName = idData.account_name;
            _context18.next = 12;
            break;
          case 11:
            accountName = account;
          case 12:
            _context18.next = 14;
            return api.v1.chain.get_account(accountName);
          case 14:
            return _context18.abrupt("return", _context18.sent);
          case 17:
            _context18.prev = 17;
            _context18.t0 = _context18["catch"](0);
            error = _context18.t0;
            if (!(error.message === 'Account not found at /v1/chain/get_account')) {
              _context18.next = 24;
              break;
            }
            throwError('Account "' + account.toString() + '" not found', exports.SdkErrors.AccountDoesntExist);
            _context18.next = 25;
            break;
          case 24:
            throw _context18.t0;
          case 25:
          case "end":
            return _context18.stop();
        }
      }, _callee18, null, [[0, 17]]);
    }));
    function getAccountInfo(_x10) {
      return _getAccountInfo.apply(this, arguments);
    }
    return getAccountInfo;
  }();
  _proto.signMessage = /*#__PURE__*/function () {
    var _signMessage = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee19(payload, recipient) {
      var signer, issuer;
      return _regeneratorRuntime().wrap(function _callee19$(_context19) {
        while (1) switch (_context19.prev = _context19.next) {
          case 0:
            signer = createVCSigner(this.keyManager, exports.KeyManagerLevel.LOCAL);
            _context19.next = 3;
            return this.getDid();
          case 3:
            _context19.t0 = _context19.sent;
            _context19.t1 = _context19.t0 + '#local';
            _context19.t2 = signer.sign;
            issuer = {
              did: _context19.t1,
              signer: _context19.t2,
              alg: 'ES256K-R'
            };
            _context19.next = 9;
            return Message.sign(payload, issuer, recipient);
          case 9:
            return _context19.abrupt("return", _context19.sent);
          case 10:
          case "end":
            return _context19.stop();
        }
      }, _callee19, this);
    }));
    function signMessage(_x11, _x12) {
      return _signMessage.apply(this, arguments);
    }
    return signMessage;
  }()
  /**
   * Generate did in storage
   * @return {string} did string
   */
  ;
  _proto.createDid =
  /*#__PURE__*/
  function () {
    var _createDid = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee20() {
      var accountName;
      return _regeneratorRuntime().wrap(function _callee20$(_context20) {
        while (1) switch (_context20.prev = _context20.next) {
          case 0:
            if (this.chainID) {
              _context20.next = 4;
              break;
            }
            _context20.next = 3;
            return getChainInfo();
          case 3:
            this.chainID = _context20.sent.chain_id;
          case 4:
            _context20.next = 6;
            return this.storage.accountName;
          case 6:
            accountName = _context20.sent;
            this.storage.did = "did:antelope:" + this.chainID + ":" + accountName.toString();
            _context20.next = 10;
            return this.storage.did;
          case 10:
            return _context20.abrupt("return", this.storage.did);
          case 11:
          case "end":
            return _context20.stop();
        }
      }, _callee20, this);
    }));
    function createDid() {
      return _createDid.apply(this, arguments);
    }
    return createDid;
  }();
  _proto.intializeFromStorage = /*#__PURE__*/function () {
    var _intializeFromStorage = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee21() {
      var accountName;
      return _regeneratorRuntime().wrap(function _callee21$(_context21) {
        while (1) switch (_context21.prev = _context21.next) {
          case 0:
            _context21.next = 2;
            return this.getAccountName();
          case 2:
            accountName = _context21.sent;
            if (!accountName) {
              _context21.next = 9;
              break;
            }
            _context21.next = 6;
            return this.checkKeysStillValid();
          case 6:
            return _context21.abrupt("return", _context21.sent);
          case 9:
            throwError('Account "' + accountName + '" not found', exports.SdkErrors.AccountDoesntExist);
          case 10:
          case "end":
            return _context21.stop();
        }
      }, _callee21, this);
    }));
    function intializeFromStorage() {
      return _intializeFromStorage.apply(this, arguments);
    }
    return intializeFromStorage;
  }();
  return User;
}();
/**
 * Initialize and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
function createUserObject(keyManager, storageFactory) {
  return new User(keyManager, storageFactory);
}

var Authority = /*#__PURE__*/function () {
  function Authority(threshold, keys, accounts, waits) {
    this.threshold = threshold;
    this.keys = keys;
    this.accounts = accounts;
    this.waits = waits;
  }
  Authority.fromKey = function fromKey(key) {
    var keys = [{
      key: key,
      weight: 1
    }];
    return new this(1, keys, [], []);
  };
  Authority.fromAccount = function fromAccount(permission) {
    var accounts = [{
      permission: permission,
      weight: 1
    }];
    return new this(1, [], accounts, []);
  }
  // to add the eosio.code authority for smart contracts
  // https://developers.eos.io/welcome/v2.1/smart-contract-guides/adding-inline-actions#step-1-adding-eosiocode-to-permissions
  ;
  var _proto = Authority.prototype;
  _proto.addCodePermission = function addCodePermission(account) {
    this.accounts.push({
      permission: {
        actor: account,
        permission: 'eosio.code'
      },
      weight: 1
    });
  };
  return Authority;
}();

var EosioContract = /*#__PURE__*/function () {
  function EosioContract() {}
  var _proto = EosioContract.prototype;
  /**
   * Deploys a contract at the specified address
   *
   * @param account - Account where the contract will be deployed
   * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
   * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
   */
  _proto.deployContract =
  /*#__PURE__*/
  function () {
    var _deployContract = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(account, wasmFileContent, abiFileContent, signer) {
      var wasm, abi, abiDef, abiSerializedHex, setcodeAction, setabiAction, actions;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            // 1. Prepare SETCODE
            // read the file and make a hex string out of it
            wasm = wasmFileContent.toString("hex"); // 2. Prepare SETABI
            abi = JSON.parse(abiFileContent);
            abiDef = eosio.ABI.from(abi);
            abiSerializedHex = eosio.Serializer.encode({
              object: abiDef
            }).hexString; // 3. Send transaction with both setcode and setabi actions
            setcodeAction = {
              account: 'eosio',
              name: 'setcode',
              authorization: [{
                actor: account.toString(),
                permission: 'active'
              }],
              data: {
                account: account.toString(),
                vmtype: 0,
                vmversion: 0,
                code: wasm
              }
            };
            setabiAction = {
              account: 'eosio',
              name: 'setabi',
              authorization: [{
                actor: account.toString(),
                permission: 'active'
              }],
              data: {
                account: account,
                abi: abiSerializedHex
              }
            };
            actions = [setcodeAction, setabiAction];
            _context.next = 9;
            return transact(eosio.Name.from('eosio'), actions, signer);
          case 9:
            return _context.abrupt("return", _context.sent);
          case 10:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function deployContract(_x, _x2, _x3, _x4) {
      return _deployContract.apply(this, arguments);
    }
    return deployContract;
  }();
  _proto.newaccount = /*#__PURE__*/function () {
    var _newaccount = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(creator, account, owner, active, signer) {
      var action;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            action = {
              authorization: [{
                actor: creator,
                permission: 'active'
              }],
              account: 'eosio',
              name: 'newaccount',
              data: {
                creator: creator,
                name: account,
                owner: owner,
                active: active
              }
            };
            _context2.next = 3;
            return transact(eosio.Name.from('eosio'), [action], signer);
          case 3:
            return _context2.abrupt("return", _context2.sent);
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function newaccount(_x5, _x6, _x7, _x8, _x9) {
      return _newaccount.apply(this, arguments);
    }
    return newaccount;
  }();
  _proto.updateauth = /*#__PURE__*/function () {
    var _updateauth = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(account, permission, parent, auth, signer) {
      var action;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            action = {
              authorization: [{
                actor: account,
                permission: parent
              }],
              account: 'eosio',
              name: 'updateauth',
              data: {
                account: account,
                permission: permission,
                parent: parent,
                auth: auth
              }
            };
            _context3.next = 3;
            return transact(eosio.Name.from('eosio'), [action], signer);
          case 3:
            return _context3.abrupt("return", _context3.sent);
          case 4:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    }));
    function updateauth(_x10, _x11, _x12, _x13, _x14) {
      return _updateauth.apply(this, arguments);
    }
    return updateauth;
  }();
  _createClass(EosioContract, null, [{
    key: "Instance",
    get: function get() {
      return this.singletonInstance || (this.singletonInstance = new this());
    }
  }]);
  return EosioContract;
}();

var EosioTokenContract = /*#__PURE__*/function () {
  function EosioTokenContract() {}
  var _proto = EosioTokenContract.prototype;
  _proto.create = /*#__PURE__*/function () {
    var _create = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(supply, signer) {
      var actions;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            actions = [{
              account: 'eosio.token',
              name: 'create',
              authorization: [{
                actor: 'eosio.token',
                permission: 'active'
              }],
              data: {
                issuer: 'eosio.token',
                maximum_supply: supply
              }
            }];
            _context.next = 3;
            return transact(eosio.Name.from('eosio.token'), actions, signer);
          case 3:
            return _context.abrupt("return", _context.sent);
          case 4:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function create(_x, _x2) {
      return _create.apply(this, arguments);
    }
    return create;
  }();
  _proto.issue = /*#__PURE__*/function () {
    var _issue = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(quantity, signer) {
      var actions;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            actions = [{
              account: 'eosio.token',
              name: 'issue',
              authorization: [{
                actor: 'eosio.token',
                permission: 'active'
              }],
              data: {
                to: 'eosio.token',
                quantity: quantity,
                memo: ''
              }
            }];
            _context2.next = 3;
            return transact(eosio.Name.from('eosio.token'), actions, signer);
          case 3:
            return _context2.abrupt("return", _context2.sent);
          case 4:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function issue(_x3, _x4) {
      return _issue.apply(this, arguments);
    }
    return issue;
  }();
  _createClass(EosioTokenContract, null, [{
    key: "Instance",
    get: function get() {
      return this.singletonInstande || (this.singletonInstande = new this());
    }
  }]);
  return EosioTokenContract;
}();

var BrowserStorage = /*#__PURE__*/function () {
  function BrowserStorage(scope) {
    this._storage = {};
    this.scope = scope;
    this._storage = {};
  }
  var _proto = BrowserStorage.prototype;
  _proto.retrieve = /*#__PURE__*/function () {
    var _retrieve = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(key) {
      var value, returnValue;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!(key in this._storage)) {
              _context.next = 2;
              break;
            }
            return _context.abrupt("return", this._storage[key]);
          case 2:
            if (!localStorage) {
              _context.next = 10;
              break;
            }
            value = localStorage.getItem(key);
            if (!value) {
              _context.next = 8;
              break;
            }
            returnValue = JSON.parse(value);
            this._storage[key] = returnValue;
            return _context.abrupt("return", returnValue);
          case 8:
            _context.next = 11;
            break;
          case 10:
            return _context.abrupt("return", undefined);
          case 11:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function retrieve(_x) {
      return _retrieve.apply(this, arguments);
    }
    return retrieve;
  }();
  _proto.store = /*#__PURE__*/function () {
    var _store = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(key, value) {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (localStorage) {
              localStorage.setItem(key, JSON.stringify(value));
            }
            this._storage[key] = value;
          case 2:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function store(_x2, _x3) {
      return _store.apply(this, arguments);
    }
    return store;
  }();
  _proto.clear = /*#__PURE__*/function () {
    var _clear = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      var i, key;
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            this._storage = {};
            if (localStorage) {
              for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                if (typeof key === 'string' && key.startsWith(this.scope)) {
                  localStorage.removeItem(key);
                }
              }
            }
          case 2:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function clear() {
      return _clear.apply(this, arguments);
    }
    return clear;
  }();
  return BrowserStorage;
}();
function browserStorageFactory(scope) {
  return new BrowserStorage(scope);
}

var ExternalUser = /*#__PURE__*/function () {
  /**
   * Creates a new external user
   *
   * @param _keyManager {KeyManager} - the key manager to use for signing
   */
  function ExternalUser(_keyManager, _storageFactory) {
    this.keyManager = _keyManager;
    this.storage = createStorage('tonomy.externalUser.', _storageFactory);
  }
  ExternalUser.getUser = /*#__PURE__*/function () {
    var _getUser = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(keyManager, storageFactory) {
      var user, accountName, result;
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (storageFactory === void 0) {
              storageFactory = browserStorageFactory;
            }
            user = new ExternalUser(keyManager, storageFactory);
            _context.prev = 2;
            _context.next = 5;
            return user.getAccountName();
          case 5:
            accountName = _context.sent;
            if (accountName) {
              _context.next = 8;
              break;
            }
            throw throwError('accountName not found', exports.SdkErrors.AccountNotFound);
          case 8:
            _context.next = 10;
            return UserApps.verifyKeyExistsForApp(accountName.toString(), keyManager);
          case 10:
            result = _context.sent;
            if (!result) {
              _context.next = 15;
              break;
            }
            return _context.abrupt("return", user);
          case 15:
            throw throwError('User Not loggedIn', exports.SdkErrors.UserNotLoggedIn);
          case 16:
            _context.next = 22;
            break;
          case 18:
            _context.prev = 18;
            _context.t0 = _context["catch"](2);
            //TODO logout
            // keyManager.clear(); must be implemented in future keymanager
            user.storage.clear();
            throw _context.t0;
          case 22:
          case "end":
            return _context.stop();
        }
      }, _callee, null, [[2, 18]]);
    }));
    function getUser(_x, _x2) {
      return _getUser.apply(this, arguments);
    }
    return getUser;
  }();
  var _proto = ExternalUser.prototype;
  _proto.getDid = /*#__PURE__*/function () {
    var _getDid = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      var accountName, chainID;
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (this.did_) {
              _context2.next = 10;
              break;
            }
            _context2.next = 3;
            return this.getAccountName();
          case 3:
            _context2.next = 5;
            return _context2.sent.toString();
          case 5:
            accountName = _context2.sent;
            _context2.next = 8;
            return getChainInfo();
          case 8:
            chainID = _context2.sent.chain_id;
            this.did_ = "did:antelope:" + chainID + ":" + accountName + "#local";
          case 10:
            return _context2.abrupt("return", this.did_);
          case 11:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function getDid() {
      return _getDid.apply(this, arguments);
    }
    return getDid;
  }()
  /**
   * Sets the account name of the user
   *
   * @param accountName {Name} - the account name of the user
   */
  ;
  _proto.setAccountName =
  /*#__PURE__*/
  function () {
    var _setAccountName = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(accountName) {
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            this.storage.accountName = accountName;
            _context3.next = 3;
            return this.storage.accountName;
          case 3:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function setAccountName(_x3) {
      return _setAccountName.apply(this, arguments);
    }
    return setAccountName;
  }()
  /**
   * Sets the username of the user
   *
   * @param username {string} - the username of the user
   */
  ;
  _proto.setUsername =
  /*#__PURE__*/
  function () {
    var _setUsername = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(username) {
      return _regeneratorRuntime().wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            this.storage.username = new TonomyUsername(username);
            _context4.next = 3;
            return this.storage.username;
          case 3:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function setUsername(_x4) {
      return _setUsername.apply(this, arguments);
    }
    return setUsername;
  }()
  /**
   * Gets the username of the user
   *
   * @returns {Promise<TonomyUsername>} - the username of the user
   */
  ;
  _proto.getUsername =
  /*#__PURE__*/
  function () {
    var _getUsername = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
      return _regeneratorRuntime().wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return this.storage.username;
          case 2:
            return _context5.abrupt("return", _context5.sent);
          case 3:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this);
    }));
    function getUsername() {
      return _getUsername.apply(this, arguments);
    }
    return getUsername;
  }()
  /**
   * Sets the login request
   *
   * @param loginRequest {JWTLoginPayload} - the login request
   */
  ;
  _proto.setLoginRequest =
  /*#__PURE__*/
  function () {
    var _setLoginRequest = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(loginRequest) {
      return _regeneratorRuntime().wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            this.storage.loginRequest = loginRequest;
            _context6.next = 3;
            return this.storage.loginRequest;
          case 3:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function setLoginRequest(_x5) {
      return _setLoginRequest.apply(this, arguments);
    }
    return setLoginRequest;
  }()
  /**
   * Gets the login request
   *
   * @returns {Promise<JWTLoginPayload>} - the login request
   */
  ;
  _proto.getLoginRequest =
  /*#__PURE__*/
  function () {
    var _getLoginRequest = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7() {
      return _regeneratorRuntime().wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return this.storage.loginRequest;
          case 2:
            return _context7.abrupt("return", _context7.sent);
          case 3:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function getLoginRequest() {
      return _getLoginRequest.apply(this, arguments);
    }
    return getLoginRequest;
  }()
  /**
   * Gets the account name of the user
   *
   * @returns {Promise<Name>} - the account name of the user
   */
  ;
  _proto.getAccountName =
  /*#__PURE__*/
  function () {
    var _getAccountName = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee8() {
      return _regeneratorRuntime().wrap(function _callee8$(_context8) {
        while (1) switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return this.storage.accountName;
          case 2:
            return _context8.abrupt("return", _context8.sent);
          case 3:
          case "end":
            return _context8.stop();
        }
      }, _callee8, this);
    }));
    function getAccountName() {
      return _getAccountName.apply(this, arguments);
    }
    return getAccountName;
  }()
  /**
   * Redirects the user to login to the app with their Tonomy ID account
   *
   * @description should be called when the user clicks on the login button
   *
   * @param onPressLoginOptions {OnPressLoginOptions} - options for the login
   * @property onPressLoginOptions.redirect {boolean} - if true, redirects the user to the login page, if false, returns the token
   * @property onPressLoginOptions.callbackPath {string} - the path to redirect the user to after login
   * @param keyManager {KeyManager} - the key manager to use to store the keys
   * @returns {Promise<string | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
   */
  ;
  ExternalUser.loginWithTonomy =
  /*#__PURE__*/
  function () {
    var _loginWithTonomy = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee9(_ref, keyManager) {
      var _ref$redirect, redirect, callbackPath, _generateRandomKeyPai, privateKey, publicKey, payload, signer, jwk, issuer, token, requests, requestsString;
      return _regeneratorRuntime().wrap(function _callee9$(_context9) {
        while (1) switch (_context9.prev = _context9.next) {
          case 0:
            _ref$redirect = _ref.redirect, redirect = _ref$redirect === void 0 ? true : _ref$redirect, callbackPath = _ref.callbackPath;
            _generateRandomKeyPai = generateRandomKeyPair(), privateKey = _generateRandomKeyPai.privateKey, publicKey = _generateRandomKeyPai.publicKey;
            if (!keyManager) {
              _context9.next = 5;
              break;
            }
            _context9.next = 5;
            return keyManager.storeKey({
              level: exports.KeyManagerLevel.BROWSER_LOCAL_STORAGE,
              privateKey: privateKey
            });
          case 5:
            payload = {
              randomString: randomString(32),
              origin: window.location.origin,
              publicKey: publicKey.toString(),
              callbackPath: callbackPath
            }; // TODO use expiresIn to make JWT expire after 5 minutes
            signer = didJwt.ES256KSigner(privateKey.data.array, true);
            _context9.next = 9;
            return createJWK(publicKey);
          case 9:
            jwk = _context9.sent;
            issuer = toDid(jwk);
            _context9.next = 13;
            return Message.sign(payload, {
              did: issuer,
              signer: signer,
              alg: 'ES256K-R'
            });
          case 13:
            token = _context9.sent.jwt;
            requests = [token];
            requestsString = JSON.stringify(requests);
            if (!redirect) {
              _context9.next = 19;
              break;
            }
            window.location.href = getSettings().ssoWebsiteOrigin + "/login?requests=" + requestsString;
            return _context9.abrupt("return");
          case 19:
            return _context9.abrupt("return", token);
          case 20:
          case "end":
            return _context9.stop();
        }
      }, _callee9);
    }));
    function loginWithTonomy(_x6, _x7) {
      return _loginWithTonomy.apply(this, arguments);
    }
    return loginWithTonomy;
  }()
  /**
   *
   * @param [keymanager=JSKEymanager]
   * @throws if user doesn't exists, keys are missing or user not loggedIn
   * @returns the external user object
   */
  //   static getUser(keymanager = JSsKeymanager: KeyManager): Promise<ExternalUser> {
  //  * checks storage for keys and other metadata
  //  * fethces user from blockchain
  //  * checks if user is loggedin by verifying the keys
  //  * delete the keys from storage if they are not verified
  //  * returns the user object
  //  */
  // return Object.assign(this, {})
  //   }
  /**
   * Signs a message with the given key manager and the key level
   *
   * @param message {any} - an object to sign
   * @param keyManager {KeyManager} - the key manager to use to sign the message
   */
  ;
  ExternalUser.signMessage =
  /*#__PURE__*/
  function () {
    var _signMessage = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee10(message, keyManager, recipient) {
      var keyManagerLevel, publicKey, signer, jwk, issuer;
      return _regeneratorRuntime().wrap(function _callee10$(_context10) {
        while (1) switch (_context10.prev = _context10.next) {
          case 0:
            keyManagerLevel = exports.KeyManagerLevel.BROWSER_LOCAL_STORAGE;
            _context10.next = 3;
            return keyManager.getKey({
              level: keyManagerLevel
            });
          case 3:
            publicKey = _context10.sent;
            if (publicKey) {
              _context10.next = 6;
              break;
            }
            throw throwError('No Key Found for this level', exports.SdkErrors.KeyNotFound);
          case 6:
            signer = createVCSigner(keyManager, keyManagerLevel).sign;
            _context10.next = 9;
            return createJWK(publicKey);
          case 9:
            jwk = _context10.sent;
            issuer = toDid(jwk);
            _context10.next = 13;
            return Message.sign(message, {
              did: issuer,
              signer: signer,
              alg: 'ES256K-R'
            }, recipient);
          case 13:
            return _context10.abrupt("return", _context10.sent);
          case 14:
          case "end":
            return _context10.stop();
        }
      }, _callee10);
    }));
    function signMessage(_x8, _x9, _x10) {
      return _signMessage.apply(this, arguments);
    }
    return signMessage;
  }()
  /**
   * Receives the login request from Tonomy ID and verifies the login was successful
   *
   * @description should be called in the callback page
   *
   * @param {options} VerifyLoginOptions - options for the login
   * @property {options.checkKeys} boolean - if true, checks the keys in the keyManager against the blockchain
   * @property {options.keyManager} KeyManager - the key manager to use to storage and manage keys
   * @property {options.storageFactory} [StorageFactory] - the storage factory to use to store data
   *
   * @returns {Promise<ExternalUser>} an external user object ready to use
   */
  ;
  ExternalUser.verifyLoginRequest =
  /*#__PURE__*/
  function () {
    var _verifyLoginRequest = /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee11(options) {
      var _result$find, _yield$options$keyMan;
      var _UserApps$getLoginReq, requests, username, accountName, result, loginRequest, keyExists, myStorageFactory, externalUser;
      return _regeneratorRuntime().wrap(function _callee11$(_context11) {
        while (1) switch (_context11.prev = _context11.next) {
          case 0:
            if (!options.checkKeys) options.checkKeys = true;
            _UserApps$getLoginReq = UserApps.getLoginRequestParams(), requests = _UserApps$getLoginReq.requests, username = _UserApps$getLoginReq.username, accountName = _UserApps$getLoginReq.accountName;
            _context11.next = 4;
            return UserApps.verifyRequests(requests);
          case 4:
            result = _context11.sent;
            loginRequest = (_result$find = result.find(function (r) {
              return r.getPayload().origin === window.location.origin;
            })) == null ? void 0 : _result$find.getPayload();
            if (!loginRequest) throwError('No login request found for this origin', exports.SdkErrors.OriginMismatch);
            _context11.t0 = loginRequest.publicKey;
            _context11.next = 10;
            return options.keyManager.getKey({
              level: exports.KeyManagerLevel.BROWSER_LOCAL_STORAGE
            });
          case 10:
            _context11.t1 = _yield$options$keyMan = _context11.sent;
            if (!(_context11.t1 == null)) {
              _context11.next = 15;
              break;
            }
            _context11.t2 = void 0;
            _context11.next = 16;
            break;
          case 15:
            _context11.t2 = _yield$options$keyMan.toString();
          case 16:
            _context11.t3 = _context11.t2;
            if (!(_context11.t0 !== _context11.t3)) {
              _context11.next = 19;
              break;
            }
            throwError('Key in request does not match', exports.SdkErrors.KeyNotFound);
          case 19:
            if (!options.checkKeys) {
              _context11.next = 24;
              break;
            }
            _context11.next = 22;
            return UserApps.verifyKeyExistsForApp(accountName, options.keyManager);
          case 22:
            keyExists = _context11.sent;
            if (!keyExists) throwError('Key not found', exports.SdkErrors.KeyNotFound);
          case 24:
            myStorageFactory = options.storageFactory || browserStorageFactory;
            externalUser = new ExternalUser(options.keyManager, myStorageFactory);
            _context11.next = 28;
            return externalUser.setAccountName(eosio.Name.from(accountName));
          case 28:
            _context11.next = 30;
            return externalUser.setLoginRequest(loginRequest);
          case 30:
            _context11.next = 32;
            return externalUser.setUsername(username);
          case 32:
            return _context11.abrupt("return", externalUser);
          case 33:
          case "end":
            return _context11.stop();
        }
      }, _callee11);
    }));
    function verifyLoginRequest(_x11) {
      return _verifyLoginRequest.apply(this, arguments);
    }
    return verifyLoginRequest;
  }();
  return ExternalUser;
}();

var EosioUtil = /*#__PURE__*/_extends({}, Eosio, Transaction);

Object.defineProperty(exports, 'ES256KSigner', {
  enumerable: true,
  get: function () {
    return didJwt.ES256KSigner;
  }
});
Object.defineProperty(exports, 'createSigner', {
  enumerable: true,
  get: function () {
    return antelopeSsiToolkit.createSigner;
  }
});
exports.App = App;
exports.Authority = Authority;
exports.BrowserStorage = BrowserStorage;
exports.Communication = Communication;
exports.EosioContract = EosioContract;
exports.EosioTokenContract = EosioTokenContract;
exports.EosioUtil = EosioUtil;
exports.ExternalUser = ExternalUser;
exports.HttpError = HttpError;
exports.IDContract = IDContract;
exports.Message = Message;
exports.SdkError = SdkError;
exports.TonomyUsername = TonomyUsername;
exports.User = User;
exports.UserApps = UserApps;
exports.browserStorageFactory = browserStorageFactory;
exports.createSdkError = createSdkError;
exports.createStorage = createStorage;
exports.createUserObject = createUserObject;
exports.createVCSigner = createVCSigner;
exports.decodeHex = decodeHex;
exports.encodeHex = encodeHex;
exports.generateRandomKeyPair = generateRandomKeyPair;
exports.getSettings = getSettings;
exports.int2hex = int2hex;
exports.randomBytes = randomBytes;
exports.randomString = randomString;
exports.setSettings = setSettings;
exports.sha256 = sha256;
exports.storageProxyHandler = storageProxyHandler;
exports.throwError = throwError;
exports.toElliptic = toElliptic;
//# sourceMappingURL=tonomy-id-sdk.cjs.development.js.map
