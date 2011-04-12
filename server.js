require(["util.js", "test", "sys", "http", "fads-server", "canasta"], function (util, test, sys, http, fads, canasta) {
    eval(IMPORT_INCLUDING("sys", "debug".words()));
    eval(IMPORT("canasta"));

    var max_name_length = 32;
    var max_message_length = 1024;

    var people_by_session_id = {};

    function new_person(session) {
        return people_by_session_id[session.id] = {
            session: session,
        };
    }

    function get_person(session) {
        return people_by_session_id[session.id] || new_person(session);
    }


    handlers = {
        nick: {
            usage: "[name,<name>]",
            validate: function (command) { return is_string(command[1]) && command[1].length < max_name_length && !exists(command[2]); },
            handle: function (person, command) {
                // XXX: might broadcast interfere with canasta?
                fads.broadcast(["name", command[1], person.name]);
                person.name = command[1];
            },
        },
        say: {
            usage: "[say,<message>]",
            validate: function (command) { return is_string(command[1]) && command[1].length < max_message_length && !exists(command[2]); },
            handle: function (person, command) {
                fads.broadcast(["say", person.name, command[1]]);
            },
        },
    };


    fads.registerMessageHandler(function (command, session) { try {
        var person = get_person(session);

        if (!is_string(person.name) && command[0] !== "name") {
            session.sendMessage(["error", "set your name first"]);
            return;
        }

        var handler = handlers[command[0]];
        if (!exists(handler)) {
            session.sendMessage(["error", "unknown command"]);
            return;
        }

        if (handler.validate && !handler.validate(command)) {
            session.sendMessage(["error", "malformed command", "usage: "+handler.usage]);
            return;
        }

        handler.handle(person, command);
    } catch(e) {
        console.log("an error occurred in the handling of a request:", e);
        console.log(e.stack);
    }});
    
    var server = http.createServer(fads.requestListener);
    server.listen(8080);
});
