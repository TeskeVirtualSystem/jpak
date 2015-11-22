// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

var JPAK = {
  Constants: {
    verbosity: 3  //  0 - Error, 1 - Warning, 2 - Info, 3 - Debug
  },
  Generics: {},
  Loader: {},
  Classes: {},
  Tools : {}
};

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  if (inNode) {
    JPAK.Tools.toBuffer = function(ab) {
      var buffer = new Buffer(ab.byteLength);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      return buffer;
    };

    JPAK.Tools.toArrayBuffer = function(buffer) {
      var ab = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
      }
      return ab;
    };
  }


  /**
   * Clean all deletedValue from array
   */
  JPAK.Tools.cleanArray = function(array, deleteValue) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === deleteValue) {         
        array.splice(i, 1);
        i--;
      }
    }
    return array;
  };

  /*
   *  Extends the Uint8Array to be able to be converted to a string
   */
  Uint8Array.prototype.asString = function() {
    var o = "";
    for(var i=0;i<this.byteLength;i++)  
        o += String.fromCharCode(this[i]);
    return o;
  };

  /*
   *  Puts a string inside the UInt8Array
   */
  Uint8Array.prototype.putString = function(offset, string) {
    if (string === undefined) {
      string = offset;
      offset = 0;
    }
    for (var i=0;i<string.length;i++) {
      this[offset+i] = string.charCodeAt(i);
    }
    return offset+string.length;
  };

  /*
   *  Converts itself to an object.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericToObject = function() {
    var output = {};
    for (var property in this) {
      if (this.hasOwnProperty(property)) {
        output[property] = this[property].toObject !== undefined ? this[property].toObject() : this[property];
      }
    }
    return output;
  };

  /*
   *  Fills its own properties based on a input object.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericFromObject = function(object) {
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        this[property] = object[property];
      }
    }
  };


  /*
   *  Converts itself to a JSON.
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericjToJSON = function() {
    return JSON.stringify(this.toObject());
  };


  /*
   *  Fills its own properties based on a json
   *
   *  To associate with a prototype.
   */
  JPAK.Generics.genericjFromJSON = function(json) {
    this.fromObject(JSON.parse(json));
  };

  JPAK.Constants.Base64_Encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  /**
   * Returns a Base64 String from an ArrayBuffer
   * Modified version from https://gist.github.com/jonleighton/958841
   */
  JPAK.Tools.ArrayBufferToBase64 = function(arrayBuffer)  {
    var base64    = '';

    var bytes         = new Uint8Array(arrayBuffer);
    var byteLength    = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength    = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
      d = chunk & 63;               // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + JPAK.Constants.Base64_Encoding[c] + JPAK.Constants.Base64_Encoding[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength];

      a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4; // 3   = 2^2 - 1

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + '==';
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

      base64 += JPAK.Constants.Base64_Encoding[a] + JPAK.Constants.Base64_Encoding[b] + JPAK.Constants.Base64_Encoding[c] + '=';
    }

    return base64;
  };

  JPAK.Tools.debug = function() {
    if (JPAK.Constants.verbosity >= 3) {
      [].splice.call(arguments, 0, 0, "(JPAK Debug)");
      if (console.debug)
        console.debug.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.error = function() {
    if (JPAK.Constants.verbosity >= 0) {
      [].splice.call(arguments, 0, 0, "(JPAK Error)");
      if (console.error)
        console.error.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.warning = function() {
    if (JPAK.Constants.verbosity >= 1) {
      [].splice.call(arguments, 0, 0, "(JPAK Warning)");
      console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.info = function() {
    if (JPAK.Constants.verbosity >= 2) {
      [].splice.call(arguments, 0, 0, "(JPAK Info)");
      if (console.info)
        console.info.apply(console, arguments);
      else
        console.log.apply(console, arguments);
    }
  };

  JPAK.Tools.d = JPAK.Tools.debug;
  JPAK.Tools.e = JPAK.Tools.error;
  JPAK.Tools.w = JPAK.Tools.warning;
  JPAK.Tools.i = JPAK.Tools.info;
  JPAK.Tools.l = JPAK.Tools.info;
  JPAK.Tools.log = JPAK.Tools.info;

  JPAK.Constants.MAGIC_TYPE = {
    "JPAK1": 0,
    "JMS1": 1,
    "JDS1": 2
  };

  JPAK.Constants.REVERSE_MAGIC_TYPE = {
    0: "JPAK1",
    1: "JMS1",
    2: "JDS1"
  };

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  if (!inNode) {
    var DataLoader = function(parameters) {
      var _this = this;
      this.xhr = new XMLHttpRequest();
      this.method = parameters.method || "GET";
      this.url = parameters.url;
      this.responseType = parameters.responseType || "arraybuffer";
      this.partial = parameters.partial  || false;
      this.partialFrom = parameters.partialFrom || 0;
      this.partialTo = parameters.partialTo || 0;
      this.fetchSize = parameters.fetchSize || false;

      this.callbacks = {
        "load" : [],
        "error" : [],
        "progress": []
      };

      this.xhr.onprogress = function(e) {
        if (e.lengthComputable && _this.onprogress !== undefined)     {  
          var percentComplete = (( (e.loaded / e.total)*10000 ) >> 0)/100;  // Rounded percent to two decimal
          _this._reportProgress({"loaded":e.loaded,"total":e.total,"percent": percentComplete}); 
        } 
      };

      this.xhr.onload = function(e) {
        if (this.status >= 200 && this.status < 300) {
          if (_this.fetchSize) 
            _this._reportLoad(parseInt(this.getResponseHeader("Content-Length")));
          else
            _this._reportLoad(this.response);
        
        } else
          _this._reportError({"text":"Error loading file! HTTP Status Code: "+this.status,"errorcode": this.status});
      };

      this.xhr.onreadystatechange = function(e) {
        if (this.readyState === 4 && (this.status  < 200 || this.status >= 300)) {
          JPAK.Tools.e("Error loading url "+_this.url+" ("+this.status+"): "+this.statusText);
          _this._reportError({"text": this.statusText, "errorcode": this.status});
        }
      };
    };

    DataLoader.prototype._reportProgress = function(progress) {
      for (var cb in this.callbacks.progress)
        this.callbacks.progress[cb](progress); 
      this.def.notify(progress);
    };

    DataLoader.prototype._reportError = function(error) {
      for (var cb in this.callbacks.error)
        this.callbacks.error[cb](error); 
      this.def.reject(error);
    };

    DataLoader.prototype._reportLoad = function(data) {
      for (var cb in this.callbacks.load)
        this.callbacks.load[cb](data);
      this.def.resolve(data);
    };

    DataLoader.prototype.start = function() {
      if (this.fetchSize) {
        this.method = "HEAD";
        this.partial = false;
      }
      this.xhr.open(this.method, this.url, true);
      this.xhr.responseType = this.responseType;
      if (this.partial)
        this.xhr.setRequestHeader("Range", "bytes="+this.partialFrom+"-"+this.partialTo);
      this.def = Q.defer();
      this.xhr.send();
      return this.def.promise;
    };

    DataLoader.prototype.on = function(event, cb) {
      if (event in this.callbacks) 
        this.callbacks[event].push(function(data) {
          cb(data);
        });
    };

    JPAK.Tools.DataLoader = DataLoader;
  }

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  var JPKDirectoryEntry = function(name, path, numfiles, directories, files, aeskey) {
    this.name = name || "";
    this.path = path || "";
    this.numfiles = numfiles || 0;
    this.directories = directories || {};
    this.aeskey = aeskey || "";
    this.files = files || {};    
  };

  JPKDirectoryEntry.prototype.toObject = JPAK.Generics.genericToObject;
  JPKDirectoryEntry.prototype.fromObject = JPAK.Generics.genericFromObject;
  JPKDirectoryEntry.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JPKDirectoryEntry.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  if (inNode) {

    var fs = require("fs");
    var path = require("path");

    JPKDirectoryEntry.prototype.fromDirectory = function(folder, jds) {
      if(fs.lstatSync(folder).isDirectory()) {
        var folders = fs.readdirSync(folder);
        for (var fn in folders) {
          var f = folders[fn];
          if (fs.lstatSync(folder+"/"+f).isFile()) {
            this.addFile(folder+"/"+f, jds);
          } else if (fs.lstatSync(folder+"/"+f).isDirectory()) {
            if (!this.directories.hasOwnProperty(path.basename(f)))
              this.directories[path.basename(f)] = new JPAK.Classes.JPKDirectoryEntry(path.basename(f));

            this.directories[path.basename(f)].fromDirectory(folder+"/"+f, jds);
          }
        }
      } else
        this.addFile(folder, jds);
    };

    JPKDirectoryEntry.prototype.addFile = function(filepath, jds, normalizeName) {
      console.log(" Adding "+(normalizeName ? path.basename(filepath) : filepath)+" to "+this.name);
      var addedData = jds.addFromFile(filepath);
      this.files[path.basename(filepath)] = new JPAK.Classes.JPKFileEntry(path.basename(filepath), normalizeName ? path.basename(filepath) : filepath, addedData[0], addedData[1], "", false, jds.name);
      this.numfiles++;
    };

  }

  JPAK.Classes.JPKDirectoryEntry = JPKDirectoryEntry;
})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var JPKFileEntry = function(name, path, offset, size, aeskey, zlib, volume, md5) {
    this.name = name || "";
    this.path = path || "";
    this.offset = offset || 0;
    this.size = size || 0;
    this.aeskey = aeskey || "";
    this.zlib = zlib || false;
    this.volume = volume || "";
    this.md5 = md5 || "";
  };

  JPKFileEntry.prototype.toObject = JPAK.Generics.genericToObject;
  JPKFileEntry.prototype.fromObject = JPAK.Generics.genericFromObject;
  JPKFileEntry.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JPKFileEntry.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JPAK.Classes.JPKFileEntry = JPKFileEntry;

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');
  if (inNode) {

    var fs = require("fs");
    var path = require("path");

    var JDS = function(name, filename) {
      this.MAGIC = "JDS1";
      this.name = name || "";
      this.filename = filename || "";
      if (fs.existsSync(filename) && fs.statSync(filename).isFile())
        this.fd = fs.openSync(filename, "r+");
      else 
        this.fd = fs.openSync(filename, "w+");

      if (fs.statSync(filename).size< 12)
        this.__buildHeader();
      this.currentPosition = 12; 
      this.CHUNK = 4096;
    };

    JDS.prototype.__buildHeader = function() {
      console.log("Creating Header in "+this.filename);
      fs.writeSync(this.fd, this.MAGIC);
      fs.writeSync(this.fd, "\x00\x00\x00\x00\x00\x00\x00\x00");
    };

    JDS.prototype.add = function(data) {
      var offset = this.currentPosition;
      var o = fs.writeSync(this.fd, data);
      this.currentPosition += o;
      return [offset, data.length];
    };

    JDS.prototype.addFromFile = function(filename) {
      var newFd = fs.openSync(filename, "r");
      var offset = this.currentPosition;
      var size = fs.statSync(filename).size;
      var c = 0;
      var data = new Buffer(this.CHUNK);
      while ( c < size ) {
        var chunk = size - c > this.CHUNK ? this.CHUNK : size - c;
        fs.readSync(newFd, data, 0, chunk);
        fs.writeSync(this.fd, data, 0, chunk, this.currentPosition);
        c += chunk;
        this.currentPosition += chunk;
      }
      fs.closeSync(newFd);
      return [offset, size];
    };

    JDS.prototype.close = function() {
      fs.closeSync(this.fd);
    };

    JPAK.Classes.JDS = JDS;
  }

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 

  var JMS = function(volumeTable, fileTable, producerId, flags, userflags) {
    this.volumeTable = volumeTable || {};
    this.fileTable = fileTable || new JPAK.Classes.JPKDirectoryEntry("root");
    this.producerId = producerId || 0;
    this.userflags = userflags || 0;
    this.MAGIC = "JMS1";
  };

  JMS.prototype.toObject = JPAK.Generics.genericToObject;
  JMS.prototype.fromObject = JPAK.Generics.genericFromObject;
  JMS.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JMS.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JMS.prototype.fromBinary = function(data) {
    if (inNode) 
      data = JPAK.Tools.toArrayBuffer(data);
    
    var MagicNumber = (new Uint8Array(data.slice(0,4))).asString();

    if (MagicNumber !== this.MAGIC) {
      console.error("MagicNumber doesn't match! Expected: "+this.MAGIC+" got "+MagicNumber);
      return;
    }

    var dV = new DataView(data);
    var fileTableOffset = dV.getUint32(data.byteLength-4);
    var volumeTableSize = fileTableOffset - 0xC;
    var fileTableSize = data.byteLength - fileTableOffset - 12;
    var fileTable = (new Uint8Array(data.slice(fileTableOffset,data.byteLength-16))).asString();
    var volumes = (new Uint8Array(data.slice(0xC,volumeTableSize+0xC))).asString();
    var volumeTable = JSON.parse((new Uint8Array(data.slice(0xC,volumeTableSize+0xC))).asString());

    this.fileTable = new JPAK.Classes.JPKDirectoryEntry();
    this.fileTable.jFromJSON(fileTable);
    this.volumeTable = {};

    for (var v in volumeTable) {
      var newVolume = new JPAK.Classes.JPKVolumeEntry();
      newVolume.fromObject(volumeTable[v]);
      this.volumeTable[v] = newVolume;
    }
  };

  JMS.prototype.toBinary = function() {
    var fileTable = this.fileTable.jToJSON();

    var volumeTable = {};
    for (var v in this.volumeTable) {
      volumeTable[v] = this.volumeTable[v].toObject();
    }
    volumeTable = JSON.stringify(volumeTable);

    var buffer = new ArrayBuffer(12 + volumeTable.length + fileTable.length + 16);
    var u8 = new Uint8Array(buffer);
    var dv = new DataView(buffer);

    dv.setUint32(buffer.byteLength-16, this.producerId, true);
    dv.setUint32(buffer.byteLength-12, this.flags, true);
    dv.setUint32(buffer.byteLength-8, this.userflags, true);

    u8.putString(this.MAGIC);
    var fileTableOffset = u8.putString(0xC, volumeTable);
    u8.putString(fileTableOffset, fileTable);
    dv.setUint32(buffer.byteLength-4, fileTableOffset, true);

    return buffer;
  };

  if (inNode) {
    var fs = require("fs");
    var path = require("path");

   JMS.prototype.fromDirectory = function(folder, jds) {
      this.fileTable.fromDirectory(folder, jds);
    };

    JMS.prototype.fromArgs = function(args, jds) {
      for(var i in args) {
        var folder = args[i];
        console.log("Adding from arg "+folder);
        if(fs.lstatSync(folder).isDirectory()) {
            if (!this.fileTable.directories.hasOwnProperty(path.basename(folder)))
              this.fileTable.directories[path.basename(folder)] = new JPAK.Classes.JPKDirectoryEntry(path.basename(folder));

            this.fileTable.directories[path.basename(folder)].fromDirectory(folder, jds);
        } else
          this.fileTable.addFile(folder, jds, true);
      }
    };

    JMS.prototype.addVolume = function (jds) {
      if (jds.name in this.volumeTable) {
        console.error(jds.name+" already in volumes list.");
        process.exit(1);
      }

      this.volumeTable[jds.name] = new JPAK.Classes.JPKVolumeEntry(jds.filename);
    };

    JMS.prototype.toFile = function (filename) {
      var fd = fs.openSync(filename, "w");
      var binData = this.toBinary();
      fs.writeSync(fd, JPAK.Tools.toBuffer(binData), 0, binData.byteLength);
      fs.closeSync(fd);
    };
  }

  JPAK.Classes.JMS = JMS;

}());
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var JPKVolumeEntry = function(filename) {
    this.filename = filename;
  };

  JPKVolumeEntry.prototype.toObject = JPAK.Generics.genericToObject;
  JPKVolumeEntry.prototype.fromObject = JPAK.Generics.genericFromObject;
  JPKVolumeEntry.prototype.jToJSON = JPAK.Generics.genericjToJSON;
  JPKVolumeEntry.prototype.jFromJSON = JPAK.Generics.genericjFromJSON;

  JPAK.Classes.JPKVolumeEntry = JPKVolumeEntry;

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

(function() {

  var inNode = (typeof module !== 'undefined' && typeof module.exports !== 'undefined'); 
  if (!inNode) {
    var Loader = function(parameters) {

      if(parameters !== undefined)    {
          this.jpakfile = parameters.file;
          this.loadall  = parameters.loadall || false;    //  TODO: Implement the fetch-on-need feature
      }

      this.tableLoaded = false;
    };

    Loader.prototype._proceedJPAK1 = function() {
      var _this = this;
      JPAK.Tools.d("JPAK1 Format");
      this.jpakType = "JPAK1";
      return this._p_getFileSize().then(function(){return _this._p_jpak1_loadFileTable();});
    };

    Loader.prototype._proceedJMS1 = function() {
      var _this = this;
      this.jpakType = "JMS";
      JPAK.Tools.d("JMS1 Format");
      return this._p_getFileSize().then(function(){return _this._p_jms1_loadFileTable();});
    };

    Loader.prototype.checkMagic = function(magic) {
      var Magic0 = (new Uint8Array(magic.slice(0,4))).asString();
      var Magic1 = (new Uint8Array(magic.slice(0,5))).asString();

      if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic0)) 
        return JPAK.Constants.MAGIC_TYPE[Magic0];
      else if (JPAK.Constants.MAGIC_TYPE.hasOwnProperty(Magic1))
        return JPAK.Constants.MAGIC_TYPE[Magic1];
      else
        return null;
    };

    Loader.prototype.load = function() {
      var _this = this;

      var MagicLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: 0,
        partialTo: 5
      });

      return MagicLoader.start().then(function(data) {
        var def = Q.defer();
        var version = _this.checkMagic(data);
        JPAK.Tools.d("Version: "+version);
        switch(version) {
          case JPAK.Constants.MAGIC_TYPE.JPAK1: return _this._proceedJPAK1();
          case JPAK.Constants.MAGIC_TYPE.JMS1: return _this._proceedJMS1();
          case null:
            JPAK.Tools.e("Invalid magic!");
            def.reject(); // TODO: Error passing
            break;
          default:
            JPAK.Tools.e("Invalid Magic Type to load: "+JPAK.Constants.REVERSE_MAGIC_TYPE[version]);
            def.reject(); // TODO: Error passing
        }
        return def.promise;
      });
    };

    /**
     * Gets the directory entry if exists.
     * Returns null if not found
     */
    Loader.prototype.findDirectoryEntry = function(path)   {
      var base = this.fileTable;
      if(this.tableLoaded) {
        if(path !== "/") {
          path = JPAK.Tools.cleanArray(path.split("/"), "");
          var dir = "", ok = true;
          for(var i=0;i<path.length;i++)    {
            dir = path[i];
            if(dir in base.directories)  
              base = base.directories[dir]; 
            else{
              ok = false;
              break;
            }
          }
          if(!ok)
            base = null;        
        }
      }
      return base;
    };

    /**
     * Gets the file entry if exists.
     * Returns null if not found
     */
    Loader.prototype.findFileEntry = function(path)    {
      var pathblock = JPAK.Tools.cleanArray(path.split("/"), "");
      var filename  = pathblock[pathblock.length-1];
      path = path.replace(filename,"");
      var base = this.findDirectoryEntry(path);
      if(base !== undefined)   
        if(filename in base.files)  
          return base.files[filename];
      return undefined;
    };

    /**
     * Lists the dir returning an object like:
     * { "dirs" : [ arrayofdirs ], "files" : [ arrayoffiles ], "error" : "An error message, if happens" }
     */
    Loader.prototype.ls = function(path)   {
      var out = { "files" : [], "dirs" : [] };
      if(this.tableLoaded) {
        var base = this.findDirectoryEntry(path);
        if(base !== undefined)  {
          for(var i in base.files)
            out.files.push(base.files[i]);
          for(i in base.directories)
            out.dirs.push({"name" : base.directories[i].name, "numfiles": base.directories[i].numfiles});
        }else
          out.error = "Directory not found!";
               
      }else
        out.error = "Not loaded";   
      return out;
    };

    Loader.prototype.getFile = function(path, type)  {
      var def = Q.defer();

      switch (this.jpakType) {
        case "JPAK1": return this._p_jpak1_getFileBlob(path, type);
        case "JMS": return this._p_jms1_getFileBlob(path, type);
        default: def.reject("Not a valid jpak file!"); 
      }

      return def.promise;
    };

    Loader.prototype.getFileURL = function(path, type) {
      return this.getFile(path, type).then(function(blob) {
        var def = Q.defer();
        if (blob !== undefined) 
          def.resolve(URL.createObjectURL(blob));
        else {
          JPAK.Tools.e("Error: Cannot find file: \""+path+"\"");
          def.reject("Error: Cannot find file: \""+path+"\"");
        }
        return def.promise;
      });
    };

    Loader.prototype.getFileArrayBuffer = function(path, type) {
      var def = Q.defer();

      switch (this.jpakType) {
        case "JPAK1": return this._p_jpak1_getFile(path, type);
        case "JMS": return this._p_jms1_getFile(path, type);
        default: def.reject("Not a valid jpak file!"); 
      }

      return def.promise;
    };

    Loader.prototype.getBase64File = function(path, type) {
      var def = Q.defer();
      this.getFileArrayBuffer(path, type).then(function(data) {
        def.resolve(JPAK.Tools.ArrayBufferToBase64(data));
      }).fail(function(error) {
        def.reject(error);
      });

      return def.promise;
    };

    Loader.prototype.getHTMLDataURIFile = function(path, type, encoding) {
      var def = Q.defer();
      this.getBase64File(path, type).then(function(data) {
        // HTML Data URI Format: data:[<MIME-type>][;charset=<encoding>][;base64],<data>
        if(data === undefined)
          def.reject("Data is undefined!");
            
        if(encoding !== undefined && encoding !== null)
          def.resolve("data:"+type+";charset="+encoding+";base64,"+data);
        else
          def.resolve("data:"+type+";base64,"+data);
      });

      return def.promise;
    };

    /** Promises **/

    Loader.prototype._p_getFileSize = function() {
      var _this = this;
      var SizeLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        fetchSize: true
      });

      return SizeLoader.start().then(function(size) {
        var def = Q.defer();
        _this.fileSize = size;
        JPAK.Tools.d("File Size: "+size);
        def.resolve(size);
        return def.promise;
      });
    };

    Loader.prototype._p_jpak1_loadFileTable = function() {
      var _this = this;
      var tableOffsetLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: this.fileSize-4,
        partialTo: this.fileSize
      });

      return tableOffsetLoader.start().then(function(data) {
        _this.fileTableOffset = new DataView(data.slice(data.byteLength-4,data.byteLength)).getUint32(0, true);
        var fileTableLoader = new JPAK.Tools.DataLoader({
          url: _this.jpakfile,
          partial: true,
          partialFrom: _this.fileTableOffset,
          partialTo: _this.fileSize - 5
        });

        return fileTableLoader.start();
      }).then(function(data) {
        var def = Q.defer();
        data = (new Uint8Array(data)).asString();
        try {
          _this.fileTable = JSON.parse(data);
          _this.tableLoaded = true;
          def.resolve(_this.fileTable);
        } catch (e) {
          def.reject(e);
        }
        return def.promise;
      });
    };

    Loader.prototype._p_jpak1_getFile = function(path, type) {
      var def = Q.defer();
      var file = this.findFileEntry(path);
      type = type || 'application/octet-binary';

      var fileLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: file.offset,
        partialTo: file.offset + file.size -1
      });

      fileLoader.start().then(function(data) {
        if(file.compressed !== undefined && file.compressed)
          data = JPAK.Tools.GZ.decompress(data);
        def.resolve(data);
      }).fail(function(error) {
        def.reject(error);
      });

      return def.promise;
    };

    Loader.prototype._p_jpak1_getFileBlob = function(path, type) {
      var def = Q.defer();

      this._p_jpak1_getFile(path, type).then(function (data) {
        def.resolve(new Blob([new Uint8Array(data).buffer], {"type":type}));
      }).fail(function(error) {
        def.reject(error);
      });

      return def.promise;
    };

    Loader.prototype._p_jms1_loadFileTable = function() {
      var _this = this;
      var tableOffsetLoader = new JPAK.Tools.DataLoader({
        url: this.jpakfile,
        partial: true,
        partialFrom: this.fileSize-4,
        partialTo: this.fileSize
      });

      return tableOffsetLoader.start().then(function(data) {
        _this.fileTableOffset = new DataView(data).getUint32(0, true);
        var fileTableLoader = new JPAK.Tools.DataLoader({
          url: _this.jpakfile,
          partial: true,
          partialFrom: _this.fileTableOffset,
          partialTo: _this.fileSize - 16 -1
        });

        return fileTableLoader.start();
      }).then(function(data) {
        data = (new Uint8Array(data)).asString();
        _this.fileTable = JSON.parse(data);
        _this.tableLoaded = true;

        var volumeTableLoader = new JPAK.Tools.DataLoader({
          url: _this.jpakfile,
          partial: true,
          partialFrom: 0xC,
          partialTo: _this.fileTableOffset -1
        });

        return volumeTableLoader.start();

      }).then(function(data) {
        var def = Q.defer();
        data = (new Uint8Array(data)).asString();
        _this.volumeTable = JSON.parse(data);
        _this.volumeTableLoaded = true;
        def.resolve(_this.fileTable);
        return def.promise;        
      });
    };

    Loader.prototype._p_jms1_getFile = function(path, type) {
      var def = Q.defer();
      var file = this.findFileEntry(path);
      type = type || 'application/octet-binary';

      if (file.volume in this.volumeTable) {
        var volumePath = this.volumeTable[file.volume].filename;
        var fileLoader = new JPAK.Tools.DataLoader({
          url: volumePath,
          partial: true,
          partialFrom: file.offset,
          partialTo: file.offset + file.size -1
        });

        fileLoader.start().then(function(data) {
          if(file.compressed !== undefined && file.compressed)
            data = JPAK.Tools.GZ.decompress(data);
          def.resolve(data);
        }).fail(function(error) {
          def.reject(error);
        });
      } else {
        def.reject("Volume \""+file.volume+"\" not found!");
      }

      return def.promise;
    };

    Loader.prototype._p_jms1_getFileBlob = function(path, type) {
      var def = Q.defer();

      this._p_jms1_getFile(path, type).then(function (data) {
        def.resolve(new Blob([new Uint8Array(data).buffer], {"type":type}));
      }).fail(function(error) {
        def.reject(error);
      });

      return def.promise;
    };

    JPAK.Loader = Loader;
  }


})();
/**
    This is a modified zip.js file from JSXGraph 
    The original code can be found at: https://github.com/jsxgraph/jsxgraph
    The JSXGraph license:
    
    #################################################################################
    
    JSXGraph is free software dual licensed under the GNU LGPL or MIT License.
    
    You can redistribute it and/or modify it under the terms of the
    
    GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version OR
    MIT License: https://github.com/jsxgraph/jsxgraph/blob/master/LICENSE.MIT
    JSXGraph is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
    
    You should have received a copy of the GNU Lesser General Public License and the MIT License along with JSXGraph. If not, see http://www.gnu.org/licenses/ and http://opensource.org/licenses/MIT/.
    #################################################################################
    
    Also,  JSX can be licensed as Apache 2.0 as I was spoken here:
    https://groups.google.com/forum/#!topic/jsxgraph/pryVzPsgmdE
    
    Look the JSXGraph Github for more infos about this code license.
    
    Modifications made to adapt to JPAK Project

**/

(function() {

  var GZ = {};

  var bitReverse = [
                    0x00, 0x80, 0x40, 0xc0, 0x20, 0xa0, 0x60, 0xe0,
                    0x10, 0x90, 0x50, 0xd0, 0x30, 0xb0, 0x70, 0xf0,
                    0x08, 0x88, 0x48, 0xc8, 0x28, 0xa8, 0x68, 0xe8,
                    0x18, 0x98, 0x58, 0xd8, 0x38, 0xb8, 0x78, 0xf8,
                    0x04, 0x84, 0x44, 0xc4, 0x24, 0xa4, 0x64, 0xe4,
                    0x14, 0x94, 0x54, 0xd4, 0x34, 0xb4, 0x74, 0xf4,
                    0x0c, 0x8c, 0x4c, 0xcc, 0x2c, 0xac, 0x6c, 0xec,
                    0x1c, 0x9c, 0x5c, 0xdc, 0x3c, 0xbc, 0x7c, 0xfc,
                    0x02, 0x82, 0x42, 0xc2, 0x22, 0xa2, 0x62, 0xe2,
                    0x12, 0x92, 0x52, 0xd2, 0x32, 0xb2, 0x72, 0xf2,
                    0x0a, 0x8a, 0x4a, 0xca, 0x2a, 0xaa, 0x6a, 0xea,
                    0x1a, 0x9a, 0x5a, 0xda, 0x3a, 0xba, 0x7a, 0xfa,
                    0x06, 0x86, 0x46, 0xc6, 0x26, 0xa6, 0x66, 0xe6,
                    0x16, 0x96, 0x56, 0xd6, 0x36, 0xb6, 0x76, 0xf6,
                    0x0e, 0x8e, 0x4e, 0xce, 0x2e, 0xae, 0x6e, 0xee,
                    0x1e, 0x9e, 0x5e, 0xde, 0x3e, 0xbe, 0x7e, 0xfe,
                    0x01, 0x81, 0x41, 0xc1, 0x21, 0xa1, 0x61, 0xe1,
                    0x11, 0x91, 0x51, 0xd1, 0x31, 0xb1, 0x71, 0xf1,
                    0x09, 0x89, 0x49, 0xc9, 0x29, 0xa9, 0x69, 0xe9,
                    0x19, 0x99, 0x59, 0xd9, 0x39, 0xb9, 0x79, 0xf9,
                    0x05, 0x85, 0x45, 0xc5, 0x25, 0xa5, 0x65, 0xe5,
                    0x15, 0x95, 0x55, 0xd5, 0x35, 0xb5, 0x75, 0xf5,
                    0x0d, 0x8d, 0x4d, 0xcd, 0x2d, 0xad, 0x6d, 0xed,
                    0x1d, 0x9d, 0x5d, 0xdd, 0x3d, 0xbd, 0x7d, 0xfd,
                    0x03, 0x83, 0x43, 0xc3, 0x23, 0xa3, 0x63, 0xe3,
                    0x13, 0x93, 0x53, 0xd3, 0x33, 0xb3, 0x73, 0xf3,
                    0x0b, 0x8b, 0x4b, 0xcb, 0x2b, 0xab, 0x6b, 0xeb,
                    0x1b, 0x9b, 0x5b, 0xdb, 0x3b, 0xbb, 0x7b, 0xfb,
                    0x07, 0x87, 0x47, 0xc7, 0x27, 0xa7, 0x67, 0xe7,
                    0x17, 0x97, 0x57, 0xd7, 0x37, 0xb7, 0x77, 0xf7,
                    0x0f, 0x8f, 0x4f, 0xcf, 0x2f, 0xaf, 0x6f, 0xef,
                    0x1f, 0x9f, 0x5f, 0xdf, 0x3f, 0xbf, 0x7f, 0xff
                  ];
          
  var cplens =  [
                  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
                  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
                ];

  var cplext =  [
                  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
                  3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99
                ]; /* 99==invalid */

  var cpdist =  [
                  0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0007, 0x0009, 0x000d,
                  0x0011, 0x0019, 0x0021, 0x0031, 0x0041, 0x0061, 0x0081, 0x00c1,
                  0x0101, 0x0181, 0x0201, 0x0301, 0x0401, 0x0601, 0x0801, 0x0c01,
                  0x1001, 0x1801, 0x2001, 0x3001, 0x4001, 0x6001
                ];

  var cpdext =  [
                  0,  0,  0,  0,  1,  1,  2,  2,
                  3,  3,  4,  4,  5,  5,  6,  6,
                  7,  7,  8,  8,  9,  9, 10, 10,
                  11, 11, 12, 12, 13, 13
                ];

  var border = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var NAMEMAX = 256;

  GZ.decompress = function ( data ) {
    var arr = new Uint8Array(data),
    gzip = new GZ.Unzip(arr).unzip();
    if(gzip.length > 0 && gzip[0].length > 0)
      data = gzip[0][0];
    else{
      data = "";
      JPAK.Tools.e("Error uncompressing data!");
    }
    return JPAK.Tools.String2ArrayBuffer(data);
  };

  /**
  * @class Unzip class
  * Class for gunzipping, unzipping and base64 decoding of files.
  * It is used for reading GEONExT, Geogebra and Intergeo files.
  *
  * Only Huffman codes are decoded in gunzip.
  * The code is based on the source code for gunzip.c by Pasi Ojala
  * @see http://www.cs.tut.fi/~albert/Dev/gunzip/gunzip.c
  * @see http://www.cs.tut.fi/~albert
  */
  GZ.Unzip = function (barray) {
    var gpflags, crc, SIZE, fileout, flens, fmax, skipdir,
        outputArr = [],
        output = '',
        debug = false,
        files = 0,
        unzipped = [],
        buf32k = new Array(32768),
        bIdx = 0,
        modeZIP = false,
        barraylen = barray.length,
        bytepos = 0,
        bitpos = 0,
        bb = 1,
        bits = 0,
        literalTree = new Array(288),
        distanceTree = new Array(32),
        treepos = 0,
        Places = null,
        Places2 = null,
        impDistanceTree = new Array(64),
        impLengthTree = new Array(64),
        len = 0,
        fpos = new Array(17),
        nameBuf = [];

    fpos[0] = 0;

    function readByte() {
      bits += 8;
      if (bytepos < barraylen)
          return barray[bytepos++];
      return -1;
    }

    function byteAlign() {
      bb = 1;
    }

    function readBit() {
      var carry;

      bits++;
      carry = (bb & 1);
      bb >>= 1;

      if (bb === 0) {
        bb = readByte();
        carry = (bb & 1);
        bb = (bb >> 1) | 0x80;
      }
      return carry;
    }

    function readBits(a) {
      var res = 0,
          i = a;

      while (i--)
        res = (res << 1) | readBit();

      if (a)
        res = bitReverse[res] >> (8 - a);

      return res;
    }

    function flushBuffer() {
      bIdx = 0;
    }

    function addBuffer(a) {
      SIZE++;
      buf32k[bIdx++] = a;
      outputArr.push(String.fromCharCode(a));

      if (bIdx === 0x8000)
        bIdx = 0;
    }

    function HufNode() {
      this.b0 = 0;
      this.b1 = 0;
      this.jump = null;
      this.jumppos = -1;
    }

    function isPat() {
      while (true) {
        if (fpos[len] >= fmax)
          return -1;

        if (flens[fpos[len]] === len)
          return fpos[len]++;

        fpos[len]++;
      }
    }

    function rec() {
      var curplace = Places[treepos],
          tmp;

      if (len === 17)
        return -1;

      treepos++;
      len++;

      tmp = isPat();

      if (tmp >= 0) {
        /* leaf cell for 0-bit */
        curplace.b0 = tmp;
      } else {
        /* Not a Leaf cell */
        curplace.b0 = 0x8000;

        if (rec())
          return -1;
      }

      tmp = isPat();

      if (tmp >= 0) {
        /* leaf cell for 1-bit */
        curplace.b1 = tmp;
        /* Just for the display routine */
        curplace.jump = null;
      } else {
        /* Not a Leaf cell */
        curplace.b1 = 0x8000;
        curplace.jump = Places[treepos];
        curplace.jumppos = treepos;
        if (rec())
            return -1;
      }
      len--;

      return 0;
    }

    function createTree(currentTree, numval, lengths, show) {
      var i;

      Places = currentTree;
      treepos = 0;
      flens = lengths;
      fmax  = numval;

      for (i = 0; i < 17; i++)
        fpos[i] = 0;  

      len = 0;

      if (rec())
        return -1;

      return 0;
    }

    function decodeValue(currentTree) {
      var len, i, b,
          xtreepos = 0,
          X = currentTree[xtreepos];

      /* decode one symbol of the data */
      while (true) {
        b = readBit();

        if (b) {
          if (!(X.b1 & 0x8000)) {
            /* If leaf node, return data */
            return X.b1;
          }

          X = X.jump;
          len = currentTree.length;

          for (i = 0; i < len; i++) {
            if (currentTree[i] === X) {
              xtreepos = i;
              break;
            }
          }
        } else {
          if (!(X.b0 & 0x8000)) {
            /* If leaf node, return data */
            return X.b0;
          }
          xtreepos++;
          X = currentTree[xtreepos];
        }
      }
    }

    function deflateLoop() {
      var last, c, type, i, j, l, ll, ll2, len, blockLen, dist, cSum,
          n, literalCodes, distCodes, lenCodes, z;

      do {
        last = readBit();
        type = readBits(2);

        if (type === 0) {
          // Stored
          byteAlign();
          blockLen = readByte();
          blockLen |= (readByte() << 8);

          cSum = readByte();
          cSum |= (readByte() << 8);

          if (((blockLen ^ ~cSum) & 0xffff))
              JPAK.Tools.d('BlockLen checksum mismatch\n');

          while (blockLen--) {
            c = readByte();
            addBuffer(c);
          }
        } else if (type === 1) {
          /* Fixed Huffman tables -- fixed decode routine */
          while (true) {
            j = (bitReverse[readBits(7)] >> 1);

            if (j > 23) {
              j = (j << 1) | readBit();    /* 48..255 */

              if (j > 199) {    /* 200..255 */
                j -= 128;    /*  72..127 */
                j = (j << 1) | readBit();        /* 144..255 << */
              } else {        /*  48..199 */
                j -= 48;    /*   0..151 */
                if (j > 143) {
                    j = j + 136;    /* 280..287 << */
                    /*   0..143 << */
                }
              }
            } else {    /*   0..23 */
              j += 256;    /* 256..279 << */
            }

            if (j < 256) {
              addBuffer(j);
            } else if (j === 256) {
              /* EOF */
              break;
            } else {
              j -= 256 + 1;    /* bytes + EOF */
              len = readBits(cplext[j]) + cplens[j];
              j = bitReverse[readBits(5)] >> 3;

              if (cpdext[j] > 8) {
                  dist = readBits(8);
                  dist |= (readBits(cpdext[j] - 8) << 8);
              } else {
                  dist = readBits(cpdext[j]);
              }

              dist += cpdist[j];

              for (j = 0; j < len; j++) {
                  c = buf32k[(bIdx - dist) & 0x7fff];
                  addBuffer(c);
              }
            }
          } // while
        } else if (type === 2) {
          // "static" just to preserve stack
          ll = new Array(288 + 32);

          // Dynamic Huffman tables
          literalCodes = 257 + readBits(5);
          distCodes = 1 + readBits(5);
          lenCodes = 4 + readBits(4);

          for (j = 0; j < 19; j++)
            ll[j] = 0;

          // Get the decode tree code lengths

          for (j = 0; j < lenCodes; j++)
            ll[border[j]] = readBits(3);
          
          len = distanceTree.length;

          for (i = 0; i < len; i++)
            distanceTree[i] = new HufNode();
          

          if (createTree(distanceTree, 19, ll, 0)) {
            flushBuffer();
            return 1;
          }

          //read in literal and distance code lengths
          n = literalCodes + distCodes;
          i = 0;
          z = -1;

          while (i < n) {
            z++;
            j = decodeValue(distanceTree);

            // length of code in bits (0..15)
            if (j < 16) {
                ll[i++] = j;
            // repeat last length 3 to 6 times
            } else if (j === 16) {
                j = 3 + readBits(2);

                if (i + j > n) {
                  flushBuffer();
                  return 1;
                }
                l = i ? ll[i - 1] : 0;

                while (j--) {
                  ll[i++] = l;
                }
            } else {
              // 3 to 10 zero length codes
              if (j === 17) {
                j = 3 + readBits(3);
              // j == 18: 11 to 138 zero length codes
              } else {
                j = 11 + readBits(7);
              }

              if (i + j > n) {
                flushBuffer();
                return 1;
              }

              while (j--) {
                ll[i++] = 0;
              }
            }
          }

          // Can overwrite tree decode tree as it is not used anymore
          len = literalTree.length;
          for (i = 0; i < len; i++)
            literalTree[i] = new HufNode();
          

          if (createTree(literalTree, literalCodes, ll, 0)) {
            flushBuffer();
            return 1;
          }

          len = literalTree.length;

          for (i = 0; i < len; i++)
            distanceTree[i] = new HufNode();

          ll2 = [];

          for (i = literalCodes; i < ll.length; i++)
              ll2[i - literalCodes] = ll[i];

          if (createTree(distanceTree, distCodes, ll2, 0)) {
              flushBuffer();
              return 1;
          }

          while (true) {
            j = decodeValue(literalTree);

            // In C64: if carry set
            if (j >= 256) {
              j -= 256;
              if (j === 0) {
                // EOF
                break;
              }

              j -= 1;
              len = readBits(cplext[j]) + cplens[j];
              j = decodeValue(distanceTree);

              if (cpdext[j] > 8) {
                dist = readBits(8);
                dist |= (readBits(cpdext[j] - 8) << 8);
              } else {
                dist = readBits(cpdext[j]);
              }

              dist += cpdist[j];

              while (len--) {
                c = buf32k[(bIdx - dist) & 0x7fff];
                addBuffer(c);
              }
            } else {
              addBuffer(j);
            }
          }
        }
      } while (!last);

      flushBuffer();
      byteAlign();

      return 0;
    }

    function nextFile() {
      var i, c, extralen, filelen, size, compSize, crc, method,
          tmp = [];

      outputArr = [];
      modeZIP = false;
      tmp[0] = readByte();
      tmp[1] = readByte();

      //GZIP
      if (tmp[0] === 0x78 && tmp[1] === 0xda) {
        deflateLoop();
        unzipped[files] = [outputArr.join(''), 'geonext.gxt'];
        files++;
      }

      //GZIP
      if (tmp[0] === 0x1f && tmp[1] === 0x8b) {
        skipdir();
        unzipped[files] = [outputArr.join(''), 'file'];
        files++;
      }

      //ZIP
      if (tmp[0] === 0x50 && tmp[1] === 0x4b) {
        modeZIP = true;
        tmp[2] = readByte();
        tmp[3] = readByte();

        if (tmp[2] === 0x03 && tmp[3] === 0x04) {
          //MODE_ZIP
          tmp[0] = readByte();
          tmp[1] = readByte();

          gpflags = readByte();
          gpflags |= (readByte() << 8);

          method = readByte();
          method |= (readByte() << 8);

          readByte();
          readByte();
          readByte();
          readByte();

          crc = readByte();
          crc |= (readByte() << 8);
          crc |= (readByte() << 16);
          crc |= (readByte() << 24);

          compSize = readByte();
          compSize |= (readByte() << 8);
          compSize |= (readByte() << 16);
          compSize |= (readByte() << 24);

          size = readByte();
          size |= (readByte() << 8);
          size |= (readByte() << 16);
          size |= (readByte() << 24);

          filelen = readByte();
          filelen |= (readByte() << 8);

          extralen = readByte();
          extralen |= (readByte() << 8);

          i = 0;
          nameBuf = [];

          while (filelen--) {
            c = readByte();
            if (c === '/' | c === ':') {
              i = 0;
            } else if (i < JPAK.GZIP.NAMEMAX - 1) {
              nameBuf[i++] = String.fromCharCode(c);
            }
          }

          if (!fileout)
            fileout = nameBuf;
          

          i = 0;
          while (i < extralen) {
            c = readByte();
            i++;
          }

          SIZE = 0;

          if (method === 8) {
            deflateLoop();
            unzipped[files] = new Array(2);
            unzipped[files][0] = outputArr.join('');
            unzipped[files][1] = nameBuf.join('');
            files++;
          }

          skipdir();
        }
      }
    }

    skipdir = function () {
      var crc, compSize, size, os, i, c,
          tmp = [];

      if ((gpflags & 8)) {
        tmp[0] = readByte();
        tmp[1] = readByte();
        tmp[2] = readByte();
        tmp[3] = readByte();

        if (tmp[0] === 0x50 &&
            tmp[1] === 0x4b &&
            tmp[2] === 0x07 &&
            tmp[3] === 0x08) {
          crc = readByte();
          crc |= (readByte() << 8);
          crc |= (readByte() << 16);
          crc |= (readByte() << 24);
        } else
          crc = tmp[0] | (tmp[1] << 8) | (tmp[2] << 16) | (tmp[3] << 24);

        compSize = readByte();
        compSize |= (readByte() << 8);
        compSize |= (readByte() << 16);
        compSize |= (readByte() << 24);

        size = readByte();
        size |= (readByte() << 8);
        size |= (readByte() << 16);
        size |= (readByte() << 24);
      }

      if (modeZIP)
          nextFile();

      tmp[0] = readByte();
      if (tmp[0] !== 8)
        return;

      gpflags = readByte();

      readByte();
      readByte();
      readByte();
      readByte();

      readByte();
      os = readByte();

      if ((gpflags & 4)) {
        tmp[0] = readByte();
        tmp[2] = readByte();
        len = tmp[0] + 256 * tmp[1];
        for (i = 0; i < len; i++) {
            readByte();
        }
      }

      if ((gpflags & 8)) {
        i = 0;
        nameBuf = [];

        c = readByte();
        while (c) {
          if (c === '7' || c === ':')
            i = 0;
          

          if (i < NAMEMAX - 1)
            nameBuf[i++] = c;

          c = readByte();
        }
      }

      if ((gpflags & 16)) {
        c = readByte();
        while (c) {
          c = readByte();
        }
      }

      if ((gpflags & 2)) {
        readByte();
        readByte();
      }

      deflateLoop();

      crc = readByte();
      crc |= (readByte() << 8);
      crc |= (readByte() << 16);
      crc |= (readByte() << 24);

      size = readByte();
      size |= (readByte() << 8);
      size |= (readByte() << 16);
      size |= (readByte() << 24);

      if (modeZIP)
        nextFile();
    };
  };

  GZ.Unzip.prototype.unzipFile = function (name) {
    this.unzip();
    for (var i = 0; i < unzipped.length; i++) {
      if (unzipped[i][1] === name) {
        return unzipped[i][0];
      }
    }
    return '';
  };

  GZ.Unzip.prototype.unzip = function () {
    nextFile();
    return unzipped;
  };

  JPAK.Tools.GZ = GZ;

})();
/**
     _ ____   _    _  __        ____    ___  
    | |  _ \ / \  | |/ / __   _|___ \  / _ \ 
 _  | | |_) / _ \ | ' /  \ \ / / __) || | | |
| |_| |  __/ ___ \| . \   \ V / / __/ | |_| |
 \___/|_| /_/   \_\_|\_\   \_/ |_____(_)___/ 
                                                
Multiuse Javascript Package
https://github.com/TeskeVirtualSystem/jpak

The MIT License (MIT)

Copyright (c) 2013 Lucas Teske

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**/

/**
  I know, this a very XGH approach. But works fined and I like it. I dare you put a file after this one!
**/
if ((typeof module !== 'undefined' && typeof module.exports !== 'undefined'))
  module.exports.JPAK = JPAK;
else
  window.JPAK = JPAK;