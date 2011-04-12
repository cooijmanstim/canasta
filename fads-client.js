define(function (require) {

var URL = "/gateway";

function debug() {
    console.log.apply(console, arguments);
}

return {
    listen: function () {
        var fads = this;
        var get = new XMLHttpRequest();
        get.open("GET", URL, true);
        get.onreadystatechange = function () {
            if (get.readyState !== 4)
                return;
            
            if (get.status === 200)
                fads.receive(get.responseText);

            if (get.status === 200 ||
                get.status === 502) { // apache2 reverse proxy timeout
                fads.listen();
            }

            get.onreadystatechange = new Function("");
            get = null;
        }.bind(this);
        get.send(null);
    },
    send: function (obj) {
        var post = new XMLHttpRequest();
        post.open("POST", URL, true);
        post.send(JSON.stringify(obj));
    },
    sendMessage: function (message) {
        this.send({ message: message });
    },
    receive: function (str) {
        var obj = JSON.parse(str);
        if (obj.fads)
            debug("fads-level info: "+obj.fads);
        if (obj.message)
            this.receiveMessage(obj.message);
    },
    receiveMessage: function (message) {
        setTimeout(function () { this.handleMessage(message); }.bind(this), 0);
    },

    registerMessageHandler: function (messageHandler) {
        this.handleMessage = messageHandler;
    },
};

});

