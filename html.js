define(["jquery.js", "util.js"], function (jquery, util) {
    function make_element_factory(tagName) {
        return function () {
            var attributes = {}, children = [];
            switch (arguments.length) {
            case 0:
                break;
            case 1:
                if (arguments[0].constructor === Object) {
                    attributes = arguments[0];
                } else {
                    children   = arguments[0];
                }
                break;
            case 2:
                attributes = arguments[0];
                children   = arguments[1];
                break;
            }
            return $(document.createElement(tagName)).attr(attributes).append(children)[0];
        };
    }
    
    var element_factories = {};
    "div span".words().forEach(function (tagName) { element_factories[tagName] = make_element_factory(tagName); });
    return element_factories;
});
