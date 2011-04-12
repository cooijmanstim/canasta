define(["util", "sys","crypto"], function (util, sys, crypto) {
    var handleMessage = function () { sys.debug("fads: no message handler"); };

    function requestListener(req, res) {
        var session = Session.for_request(req);
        if (session) {
            session.process(req, res);
        } else {
            session = new Session();
            res.writeHead(200, { "content-type": "text/plain",
                                 "set-cookie": "fadssession="+session.id, });
            res.end(JSON.stringify({ fads: "session established" }));
        }
    };

    function registerMessageHandler(messageHandler) {
        handleMessage = messageHandler;
    };

    function broadcast(message) {
        for (var id in sessions)
            sessions[id].sendMessage(message);
    };

    var sessions = {};
    function Session() {
        this.id = Session.generate_new_id();
        sessions[this.id] = this;
        this.sendQueue = [];
    };
    Session.for_request = function (req) {
        if (req.headers.cookie) {
            var id = req.headers.cookie.match(/fadssession=([0-9a-zA-Z]+)/)[1];
            if (id && id in sessions)
                return sessions[id];
        }
    };
    Session.generate_new_id = function () {
        var id = null;
        var hash = crypto.createHash("sha1");
        do {
            hash.update(""+Math.random()); // XXX: the terriblest of terrible ideas?
            id = hash.digest("hex");
        } while (id in sessions);
        return id;
    };
    Session.prototype = {
        process: function (req, res) {
            switch (req.method) {
            case "GET":
                this.setResponseObject(res);
                break;
            case "POST":
                this.receive(req, res);
                break;
            default:
                res.writeHead(500, { "content-type": "text/plain" });
                res.end("fads != http");
                break;
            }
        },

        // if send fails because there is no response object, it pushes stuff here
        // (must be initialized in the constructor)
        sendQueue: null,

        setResponseObject: function (res) {
            if (this.responseObject)
                this.send({ fads: "replacing old socket" });
            this.responseObject = res;
            if (this.sendQueue.length > 0)
                this.send(this.sendQueue.shift());
        },

        send: function (obj) {
            var data = JSON.stringify(obj);

            if (!this.responseObject) {
                this.sendQueue.push(obj);
                sys.debug("queued data to session "+this.id+": "+data);
                return;
            }

            this.responseObject.writeHead(200, { "content-type": "text/plain",
                                                 "connection":   "keep-alive", });
            this.responseObject.end(data);
            this.responseObject = null;
            
            sys.debug("sent data to session "+this.id+": "+data);
        },
        sendMessage: function (message) {
            this.send({ message: message });
        },

        receive: function (req, res) {
            var body = "";
            req.addListener("data", function (data) {
                body += data;
            });
            req.addListener("end", function () {
                sys.debug("got data for session "+this.id+": "+body);

                var obj = JSON.parse(body);
                if (obj.fads)
                    sys.debug("fads-level info for "+this.id+": "+sys.inspect(obj.fads));
                this.receiveMessage(obj.message);

                res.writeHead(200, { "content-type": "text/plain" });
                res.end();
            }.bind(this));
        },
        receiveMessage: function (message) {
            handleMessage(message, this);
        },
    };

    return eval(EXPORT("requestListener registerMessageHandler broadcast".words()));
});
