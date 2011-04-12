if (typeof window !== 'undefined')
    window.global = window;


/* start of highly disagreeable things */
EXPORT = function (words) {
    // have to wrap it in parens to prevent it from being interpreted as a block with labels
    return "({"+map(function (word) { return word+":"+word; }, words).join(",\n")+"})";
};

// returns an evalable string that imports properties of the given module into the current scope.
// module should be the module name (a string)
IMPORT = function (module) {
    return IMPORT_EXCLUDING(module, []);
};

// import only the given properties
IMPORT_INCLUDING = function (module, inclusions) {
    return "{"+
        map(function (inclusion) {
            var value = module+"."+inclusion;
            return "if (typeof "+inclusion+" === 'undefined')                            \n"+
                   "  var "+inclusion+" = (typeof "+value+" === 'function')              \n"+
                   "                   ? "+value+".bind("+module+")                      \n"+
                   "                   : "+value+";                                      \n"+
                   "else throw new Error('attempt to import already-defined variable');  \n";
        }, inclusions).join("\n")
        +"}";
};

// import all but the given properties
IMPORT_EXCLUDING = function (module, exclusions) {
    return "eval(IMPORT_INCLUDING('"+module+"', (function (module, exclusions) {  \n"+
           "    var words = [];                                                   \n"+
           "    for (var word in "+module+") {                                    \n"+
           "        if (!contains(word, exclusions))                              \n"+
           "            words.push(word);                                         \n"+
           "    }                                                                 \n"+
           "    return words;                                                     \n"+
           "})("+module+", "+JSON.stringify(exclusions)+")))                      \n";
};
/* end of highly disagreeable things */


Array.slice  = Array.slice  || function (array, begin, end) { return Array.prototype.slice.apply(array, [begin, end]); };
Array.concat = Array.concat || function (/* arrays */)      { return Array.prototype.concat.apply([], arguments); };

// unlike CL
prepend = function (obj, list) { return concatenate([obj], list); };
append = function (obj, list) { return concatenate(list, [obj]); };

// don't use Array.concat because it's sloppy (arguments can be non-lists) and treats "arguments" objects as non-lists
// use low-level javascript to be able to handle argument objects and avoid infinite recursion through apply()
concatenate = function (/* lists... */) {
    var result = [];
    for (i = 0; i < arguments.length; i++) {
        for (var j = 0; j < arguments[i].length; j++)
            result.push(arguments[i][j]);
    }
    return result;
};

apply = function (fn /*, arg, arg, ..., args */) {
    var args = Array.slice(arguments, 1);
    if (args.length > 0) {
        var lastarg = args[args.length-1];
        if (!is_list(lastarg))
            throw new Error("not a spreadable argument designator: last element is not a list");
        args.splice.apply(args, concatenate([args.length-1, 1], lastarg));
    }
    return fn.apply(global, args);
};

curry = function (fn /*, args... */) {
    var args = Array.slice(arguments, 1);
    return function () {
        var args2 = Array.slice(arguments, 0);
        return fn.apply(this, args.concat(args2));
    };
};

rcurry = function (fn /*, args... */) {
    var args = Array.slice(arguments, 1);
    return function () {
        var args2 = Array.slice(arguments, 0);
        return fn.apply(this, args2.concat(args));
    };
};

negate = function (fn) {
    return function () {
        return !fn.apply(this, arguments);
    };
};


map = function (fn /*, lists... */) {
    var lists = Array.slice(arguments, 1);
    return lists.transpose().map(function (args) { return apply(fn, args); });
};

flatmap = function (fn /*, lists... */) {
    return flatten(apply(map, Array.slice(arguments, 0)));
};

reduce = function (fn, list, base) {
    return list.reduce(fn, base);
};

all = function (test /*, lists... */) {
    var lists = Array.slice(arguments, 1);
    return lists.transpose().every(function (args) {
        return test.apply(this, args);
    });
};

none = function (test /*, lists... */) {
    arguments[0] = negate(arguments[0]);
    return apply(all, arguments);
};

any = some = negate(none);
notall = negate(all);


each = function (fn /*, lists... */) {
    apply(map, arguments);
};


find = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    return find_if(curry(test, obj), list);
};

find_if = function (predicate, list) {
    var pos = position_if(predicate, list);
    if (pos === null) return null;
    else return list[pos];
};

find_if_not = function (predicate, list) {
    return find_if(negate(predicate), list);
};


position = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    return position_if(curry(test, obj), list);
};

position_if = function (predicate, list) {
    for (var i = 0; i < list.length; i++)
        if (predicate(list[i]))
            return i;
    return null;
};

position_if_not = function (predicate, list) {
    return position_if(negate(predicate), list);
};


contains = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    return contains_if(curry(test, obj), list);
};

contains_if = any;
contains_if_not = notall;

contains_all = function (objs, list, test) {
    if (arguments.length < 3) test = identical;
    return all(rcurry(contains, list, test), objs);
};

contains_one_to_one = function (objs, list, test) {
    if (arguments.length < 3) test = identical;
    if (list.length < objs.length)
        return false;
    list = copy_list(list);
    for (var i = 0; i < objs.length; i++) {
        var j = position(objs[i], list, test);
        if (j === null)
            return false;
        else
            deleet_at(j, list);
    }
    return true;
};


count = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    return count_if(curry(test, obj), list);
};

count_if = function (predicate, list) {
    return reduce(function (count, elt) {
        return predicate(elt) ? count + 1 : count;
    }, list, 0);
};

count_if_not = function (predicate, list) {
    return count_if(negate(predicate), list);
};


deleet = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    deleet_if(curry(test, obj), list);
};

deleet_if = function (predicate, list) {
    for (var i = 0; i < list.length; i++) {
        if (predicate(list[i])) {
            deleet_at(i, list);
            i--;
        }
    }
};

deleet_if_not = function (predicate, list) {
    return deleet_if(negate(predicate), list);
};

deleet_one = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    var pos = position(obj, list, test);
    if (pos === null) throw new Error("no such element");
    else deleet_at(pos, list);
};

deleet_one_to_one = function (objs, list, test) {
    if (arguments.length < 3) test = identical;
    each(rcurry(deleet_one, list, test), objs);
};

deleet_at = function (pos, list) {
    list.splice(pos, 1);
};


remove = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    return remove_if(curry(test, obj), list);
};

remove_if = function (predicate, list) {
    return list.filter(negate(predicate));
};

remove_if_not = function (predicate, list) {
    return list.filter(predicate);
};

remove_one = function (obj, list, test) {
    if (arguments.length < 3) test = identical;
    var pos = position(obj, list, test);
    if (pos === null) throw new Error("no such element");
    return remove_at(pos, list);
};

remove_one_to_one = function (objs, list, test) {
    if (arguments.length < 3) test = identical;
    list = copy_list(list);
    deleet_one_to_one(objs, list, test);
    return list;
};

remove_at = function (pos, list) {
    list = copy_list(list);
    deleet_at(pos, list);
    return list;
};

is_empty = function (list) {
    return list.length === 0;
};

copy_list = function (list) {
    return Array.slice(list, 0);
};

reverse = function (list) {
    return copy_list(list).reverse();
};

flatten = function (list) {
    return apply(concatenate, list);
};

sort = function (list, predicate) {
    list.sort(predicate);
    return list;
};

shuffle = function (list) {
    return sort(list, function () { return Math.random()*2-1; });
};

Array.prototype.indices = function () {
    var result = [];
    for (var i = 0; i < this.length; i++)
        result.push(i);
    return result;
};

Array.prototype.equals = function (that) {
    if (identical(this, that)) return true;
    if (!is_list(that) || this.length !== that.length) return false;
    for (var i = 0; i < this.length; i++)
        if (this[i] !== that[i])
            return false;
    return true;
};

Array.prototype.peek = function () {
    return this[this.length-1];
};

Array.prototype.push_new = function (obj, test) {
    if (arguments.length < 2) test = identical;
    if (!contains(obj, this, test))
        this.push(obj);
};

Array.prototype.push_all = function (objs) {
    each(this.push.bind(this), objs);
};

Array.prototype.groups_of = function (length) {
    var result = [];
    for (var i = 0; i < this.length; i += length)
        result.push(this.slice(i, i+length));
    return result;
};

Array.prototype.pairs = function () {
    return this.groups_of(2);
};

// transposes a two-dimensional m by n array, where n is the length of
// the shortest inner array.  that is, the result is truncated:
//   [[1,2,3,4,5,6,7],[1,2,3]].transpose() <=> [[1,1],[2,2],[3,3]]
Array.prototype.transpose = function () {
    var result = [];
    var shortest = Infinity;
    for (var i = 0; i < this.length; i++) {
        if (this[i].length < shortest)
            shortest = this[i].length;
        
        for (var j = 0; j < this[i].length; j++) {
            result[j] = result[j] || [];
            result[j][i] = this[i][j];
        }
    }
    if (shortest < Infinity)
        result.length = shortest;
    return result;
};


Object.from_alist = function (alist) {
    var obj = {};
    alist.forEach(function (pair) {
        // earlier items shadow later ones
        if (!(pair[0] in obj))
            obj[pair[0]] = pair[1];
    });
    return obj;
};

Object.from_plist = function (plist) {
    return Object.from_alist(plist.pairs());
};

Function.prototype.bind = function (obj /*, args... */) {
    var f = this;
    var args = Array.slice(arguments, 1);
    return function () {
        var args2 = Array.slice(arguments, 0);
        return f.apply(obj, args.concat(args2));
    };
};


String.prototype.words = function () { return this.trim().split(/\s+/); };
String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); };


Number.prototype.elements = function () {
    var result = [];
    for (var i = 0; i < this; i++)
        result[i] = i;
    return result;
};


identical = function (a, b) { return a === b; };
identity = function (v) { return v; };

tree_equal = function (a, b, test) {
    if (arguments.length < 3) test = identical;
    if (a === b) return true;
    if (is_list(a) && is_list(b)) {
        if (a.length === b.length)
            return all(rcurry(tree_equal, test), a, b);
        else
            return false;
    } else {
        return test(a, b);
    }
};

set_product = function (/* lists... */) {
    if (arguments.length === 0) return [[]];
    var subproduct = apply(set_product, Array.slice(arguments, 1));
    return flatmap(function (elt) {
        return map(curry(prepend, elt), subproduct);
    }, arguments[0]);
};

set_equal = function (a, b, test) {
    if (arguments.length < 3) test = identical;
    return subset(a, b, test) && subset(b, a, test);
};

subset = contains_all;


property_test = function (property, value, test) {
    if (arguments.length < 3) test = identical;
    return function (obj) { return test(obj[property], value); }
};

constantly = function (v) { return function () { return v; }; };


is_zero = function (quantity) {
    return (is_number(quantity) && quantity === 0) || (is_vector(quantity) && all(is_zero, quantity));
};

is_number = function (quantity) {
    return typeof(quantity) === "number";
};

is_vector = function (quantity) {
    return is_list(quantity);
};

is_list = function (obj) {
    return exists(obj) && exists(obj.length) && !is_string(obj);
};

is_string = function (obj) {
    return exists(obj) && obj.constructor === String;
};

exists = function (obj) {
    return obj !== null && typeof obj !== "undefined";
};


vectorize = function (combinator, base) {
    return function (quantities) {
        quantities = Array.slice(arguments, 0);
        return quantities.reduce(function (result, quantity) {
            if (is_number(result) && is_number(quantity)) return combinator(result, quantity);
            if (is_number(result) && is_vector(quantity)) return map(curry(combinator, result), quantity);
            if (is_vector(result) && is_number(quantity)) return map(rcurry(combinator, quantity), result);
            if (is_vector(result) && is_vector(quantity)) return map(combinator, result, quantity);
        }, base);
    };
};

// elementwise vector arithmetic
times = vectorize(function (a, b) { return a * b; }, 1);
plus  = vectorize(function (a, b) { return a + b; }, 0);

sum = function (v) { return reduce(plus, v); }
product = function (v) { return reduce(times, v); }

is_integer = function (n) { return is_number(n) && Math.floor(n) === n; };

is_positive = function (n) {
    if (!is_number(n)) throw new Error("is_positive called with non-number argument");
    return n > 0;
};

is_negative = function (n) {
    if (!is_number(n)) throw new Error("is_positive called with non-number argument");
    return n < 0;
};

is_nonpositive = negate(is_positive);
is_nonnegative = negate(is_negative);

is_positive_integer = function (n) { return is_integer(n) && is_positive(n); };
is_negative_integer = function (n) { return is_integer(n) && is_negative(n); };
is_nonpositive_integer = function (n) { return is_integer(n) && is_nonpositive(n); };
is_nonnegative_integer = function (n) { return is_integer(n) && is_nonnegative(n); };


random_position_within = function (bounds) {
    return map(random_nonnegative_integer_below, bounds);
};

random_nonnegative_integer_below = function (ceiling) {
    return random_integer_between(0, ceiling);
};

random_integer_between = function (floor, ceiling) {
    return Math.floor(floor + Math.random() * (ceiling - floor));
};

postpone = function (fn) { setTimeout(fn, 0); };
