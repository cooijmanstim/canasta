define(["util"], function (util) {
    function assert(test) {
        if (!test.call()) {
            console.log(test.toString());
            throw new Error("up");
        }
    }
    
    function expect(test, expectation, form) {
        if (arguments.length < 3) {
            form = expectation;
            expectation = test;
            test = tree_equal;
        }
        var actuality = form.call();
        if (!test(actuality, expectation)) {
            console.log("test failed: ", form.toString());
            console.log("expected: ", JSON.stringify(expectation));
            console.log("got: ", JSON.stringify(actuality));
            throw new Error("up");
        }
    }
    
    expect(1, function () { return 1 });
    expect([1,[2,[[3], 4]],[6,[7]]], function () { return [1,[2,[[3], 4]],[6,[7]]]; });
    expect("haj he", function () { return "  haj he ".trim(); });
    expect(["hoer", "a"], function () { return "   hoer a ".words(); });
    expect([[1,4,7],[2,5,8],[3,6,9]], function () { return [[1,2,3],[4,5,6],[7,8,9]].transpose(); });
    expect([2, 3, 4], function () { return Array.slice([ 1, 2, 3, 4 ], 1); });
    expect("me", function () { return identity("me"); });
    expect(5, function () { return (function (a) { return this+a; }).bind(2)(3); });
    
    assert(function () {
        var obj = Object.from_alist([['1', 2], ['3', 4], ['3', 5], ['6', 7]]);
        return obj['1'] === 2 && obj['3'] === 4 && obj['6'] === 7;
    });
    
    assert(function () {
        // the return value should be an object, not a list
        return !tree_equal([], Object.from_alist([]));
    });
    
    expect([0,1,2,3], function () { return  apply(function () { return Array.slice(arguments, 0); }, 0, 1, [2,3]); });
    expect([0,1,2,3], function () { return  curry(function () { return Array.slice(arguments, 0); }, 0, 1)(2, 3); });
    expect([0,1,2,3], function () { return rcurry(function () { return Array.slice(arguments, 0); }, 2, 3)(0, 1); });
    expect(true,      function () { return negate(function () { return 2 + 2 === 5; })(); });
    expect([0,1,2,3], function () { return prepend(0, [1,2,3]); });
    expect([0,1,2,3], function () { return  append(3, [0,1,2]); });
    expect([0,1,2,3], function () { return concatenate([0,1],[2],[3]); });
    expect([0,1,2,3], function () { return flatten([[0],[1,2],[3]]); });
    expect([1,2,3],   function () { return map(identity, [1,2,3]); });
    expect([5,7,9],   function () { return map(plus, [1,2,3], [4,5,6,7]); });
    expect([4,3,6,8], function () { return flatmap(function (a, b) { return [a+b, a*b]; }, [1,2], [3,4,5]); });
    expect(10,        function () { return reduce(function (sum, elt) { return sum + elt; }, [1,2,3,4], 0); });
    expect(true,      function () { return all(is_positive_integer, [3,1,2,3]); });
    expect(true,      function () { return none(is_negative_integer, [3,1,2,3]); });
    expect(3,         function () { return find(3, [3,1,2,3]); });
    expect(null,      function () { return find(0, [3,1,2,3]); });
    expect(null,      function () { return find([], [[]], identical); });
    expect(0,         function () { return position(3, [3,1,2,3]); });
    expect(null,      function () { return position(0, [3,1,2,3]); });
    expect(true,      function () { return contains(3, [3,1,2,3]); });
    expect(false,     function () { return contains(0, [3,1,2,3]); });
    expect(2,         function () { return count(3, [3,1,2,3]); });
    expect(0,         function () { return count(0, [3,1,2,3]); });
    expect(true,      function () { return contains_all([1,2,1], [3,1,2,3]); });
    expect(false,     function () { return contains_one_to_one([1,2,1], [3,1,2,3]); });
    expect(true,      function () { return contains_one_to_one([3,2,3], [3,1,2,3]); });

    // remove_*
    assert(function () {
        var a = [3,1,2,3];
        a = remove(3, a);
        return tree_equal(a, [1,2]);
    });
    assert(function () {
        var a = [3,1,2,3];
        a = remove_at(2, a);
        return tree_equal(a, [3,1,3]);
    });
    assert(function () {
        var a = [3,1,2,3];
        a = remove_one(3, a);
        return tree_equal(a, [1,2,3]) || tree_equal(a, [3,1,2]);
    });
    assert(function () {
        var a = [3,1,2,3];
        a = remove_one_to_one([3,2,3], a);
        return tree_equal(a, [1]);
    });

    // deleet_*
    assert(function () {
        var a = [3,1,2,3];
        deleet(3, a);
        return tree_equal(a, [1,2]);
    });
    assert(function () {
        var a = [3,1,2,3];
        deleet_at(2, a);
        return tree_equal(a, [3,1,3]);
    });
    assert(function () {
        var a = [3,1,2,3];
        deleet_one(3, a);
        return tree_equal(a, [1,2,3]) || tree_equal(a, [3,1,2]);
    });
    assert(function () {
        var a = [3,1,2,3];
        deleet_one_to_one([3,2,3], a);
        return tree_equal(a, [1]);
    });

    expect(5, function () { return plus(2, 3); });
    expect([5, 6], function () { return plus(2, [3, 4]); });
    expect([5, 6], function () { return plus([3, 4], 2); });
    expect([8, 10], function () { return plus([5, 6], [3, 4]); });
    expect(6, function () { return times(2, 3); });
    expect([6, 8], function () { return times(2, [3, 4]); });
    expect([6, 8], function () { return times([3, 4], 2); });
    expect([15, 24], function () { return times([5, 6], [3, 4]); });

    expect([0,1,2,3], function () { return sort([0,2,3,1], function (a, b) { return a < b ? -1 : 1; }); });
    expect(rcurry(set_equal, tree_equal), [[0,0],[1,0],[0,1],[1,1]], function () { return set_product([0,1],[0,1]); });
});
