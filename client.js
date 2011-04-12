require(["jquery", "util", "test", "cards", "fads-client", "interface"], function (jquery, util, test, cards, fads, interface) {
    eval(IMPORT("cards"));

    debug = console.log.bind(console);

    var state = {
        players: [],
        top_of_pile: placeholder_card,
        my_id: null,
        current_player_id: null,
        capabilities: [],
        clone: function () {
            var copy = JSON.parse(JSON.stringify(this));
            copy.clone = this.clone;
            return copy;
        },
    };

    handlers = {};

    handlers.private = {};
    handlers.public = {};

    handlers.private.synchronize = function (player, context) {
        state.players = context.players;
        state.my_id = context.your_id;
        state.top_of_pile = context.top_of_pile;
    };
    handlers.private.accept = function (player, context) {
        state.capabilities = context.actions;
    };
    handlers.private.draw = function (player, context) {
        player.hand.push(context.card);
        player.red_threes.push_all(context.red_threes);
    };
    handlers.private.grab = function (player, context) {
        player.hand.push_all(context.cards);
        state.top_of_pile = placeholder_card;
    };
    handlers.private.meld = function (player, context) {
        deleet_one_to_one(context.cards, player.hand, cards_equal);

        var meld = find_if(property_test("id", context.meld), player.melds) || {
            id: context.meld,
            cards: [],
        };
        meld.cards.push_all(context.cards);
        player.melds.push_new(meld, identical);
    };
    handlers.private.discard = function (player, context) {
        deleet_one(context.card, player.hand, cards_equal);
        // TODO: handle black threes and jokers
        state.top_of_pile = context.card;
    };

    // TODO: handle end game
    handlers.public.turn = function (player, context) {
        state.whoseturn = player;
    };
    handlers.public.draw = function (player, context) {
        player.hand.push(context.card);
        player.red_threes.push_all(context.red_threes);
    };
    handlers.public.grab = function (player, context) {
        player.hand.push_all(context.cards);
        state.top_of_pile = placeholder_card;
    };
    handlers.public.meld = function (player, context) {
        deleet_one_to_one(context.cards.map(constantly(unknown_card)), player.hand, cards_equal);

        var meld = find_if(property_test("id", context.meld), player.melds);
        if (meld) {
            meld.cards.push_all(context.cards);
        } else {
            meld = {
                id: context.meld,
                cards: context.cards,
            };
            player.melds.push(meld);
        }
    };
    handlers.public.discard = function (player, context) {
        deleet_one(unknown_card, player.hand, cards_equal);
        state.top_of_pile = context.card;
    };

    function handleLeftover(player, message) {
        debug('message fell through: '+JSON.stringify(message));
    }

    fads.registerMessageHandler(function (messages) {
        messages.forEach(function (message) {
            var privacy, player_id;
            if (typeof message.player === "undefined" || message.player === null) {
                privacy = "private";
                player_id = state.my_id;
            } else {
                privacy = "public";
                player_id = message.player;
            }
            var player = find_if(property_test("id", player_id), state.players);
            var handler = handlers[privacy][message.type] || handleLeftover;
            handler(player, message);
            interface.synchronize(state);
        });
    });
    fads.listen();
    
    
    window.start_game = function () {
        fads.sendMessage(['start']);
    };

    window.synchronize = function () {
        fads.sendMessage([{ type: "synchronize" }]);
    };

    window.draw = function () {
        fads.sendMessage([{ type: "draw" }]);
    };

    window.grab = function (using, meld_id) {
        fads.sendMessage([{ type: "grab", using: using, meld: meld_id }]);
    };

    window.meld = function (cards, meld_id) {
        fads.sendMessage([{ type: "meld", cards: cards, meld: meld_id }]);
    };

    window.discard = function (card) {
        fads.sendMessage([{ type: "discard", card: card }]);
    };


    window.runinthere = function (str) { return eval(str); };
    window.canastaState = state;

    $(document).ready(function () {
    });
});
