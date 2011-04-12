require(["util.js", "test", "sys", "http", "fads-server", "cards"], function (util, test, sys, http, fads, cards) {
    eval(IMPORT_INCLUDING("sys", "debug".words()));
    eval(IMPORT("cards"));


    var generate_guid = (function () {
        var counter = 0;
        return function () { return ""+counter++; };
    })();

    function is_guid(obj) {
        return typeof obj === "string";
    }


    function card_value(card) {
        return Object.from_plist("ace 20 two 20 three 100 four 5 five 5 six 5 seven 5 eight 10 nine 10 ten 10 jack 10 queen 10 king 10 joker 50".words())[card.rank];
    }

    function is_wildcard(card) {
        return contains(card.rank, "joker two".words());
    }

    function is_red_three(card) {
        return card.rank === "three" && contains(card.suit, "hearts diamonds".words())
    }

    function is_black_three(card) {
        return card.rank === "three" && contains(card.suit, "spades clubs".words());
    }

    function melds_with(a, b) {
        return a.rank === b.rank || is_wildcard(a) || is_wildcard(b);
    }
    
    function cards_make_valid_meld(cards) {
        if (cards.length < 3) return false;
        var nonjoker = find_if_not(is_wildcard, cards);
        if (nonjoker)
            return all(curry(melds_with, nonjoker), cards) && count_if(is_wildcard, cards) < cards.length/2.0;
        else
            return false;
    }

    function new_meld() {
        var meld = {
            id: generate_guid(),
            cards: [],
        };
        return meld;
    }

    function meld_value(meld) {
        var value = sum(map(card_value, meld.cards));
        if (is_canasta(meld))
            value += is_natural_canasta(meld) ? 600 : 300;
        return value;
    }

    function is_canasta(meld) {
        return cards_make_valid_meld(meld.cards) && meld.cards.length >= 7;
    }


    var initial_hand_size = 15;

    var players_by_session_id = {};

    function new_game(players, callback) {
        var game = {
            players: players,
            deck: [],
            pile: [],
            pile_blocked_below: 0,
            pile_frozen: false,
            current_player: -1, // index into players[]
            game_over: false,
            ending_player: null,
            on_end: callback,
        };
        return game;
    }

    function play(game) {
        game.deck = shuffle(concatenate(deck(), deck())); // use two decks
        deal(game);
        each(function (player) {
            // XXX: UGLY
            player.session.sendMessage(handlers.synchronize.handle(game, player, { type: "synchronize" }).private);
        }, game.players);
        turn(0);
    }

    function draw_card(game) {
        if (is_empty(game.deck)) {
            game.deck = game.pile.reverse();
            game.pile_blocked_below = 0;
        }
        return game.deck.pop();
    }

    function deal(game) {
        each(function (player) {
            while (player.hand.length < initial_hand_size) {
                var card = draw_card(game);
                if (!exists(card))
                    throw new Error("deck depleted before done dealing");
                if (is_red_three(card))
                    player.red_threes.push(card);
                else
                    player.hand.push(card);
            }
        }, game.players);
        prime_pile(game);
    }

    function prime_pile(game) {
        while (is_empty(game.pile)) {
            var card = draw_card(game);
            if (!exists(card))
                throw new Error("deck depleted before done priming pile");
            if (is_red_three(card) || is_black_three(card) || is_wildcard(card))
                game.deck.unshift(card);
            else
                game.pile.push(card);
        }
    }

    function turn(game, player_index) {
        game.current_player = player_index;
        var player = game.players[player_index];
        player.capabilities = ["draw", "grab"];
        player.session.sendMessage([{ type: "accept", actions: player.capabilities }]);
        fads.broadcast([{ type: "turn", player: player.id }]);
    }

    function game_over(game, ending_player) {
        game.game_over = true;
        game.ending_player = ending_player;
        game.current_player = -1;
        var outcome = map(function (player) {
            return {
                id: player.id,
                hand: player.hand,
                red_threes: player.red_threes,
                melds: player.melds,
                score: score(game, player),
            };
        }, game.players);
        each(function (player) {
            player.capabilities = [];
            player.session.sendMessage([{ type: "end", players: outcome }]);
        }, game.players);
    }

    function public_state(game) {
        return {
            players: map(function (player) {
                return {
                    id: player.id,
                    hand: map(constantly(unknown_card), player.hand),
                    red_threes: player.red_threes,
                    melds: player.melds,
                };
            }, game.players),
            top_of_pile: game.pile.peek() || placeholder_card,
        };
    }

    function score(game, player) {
        var score = 0;
        if (player === game.ending_player)
            score += 100;
        if (player.red_threes.length === 4)
            score += 800;
        else
            score += 100*red_threes.length;
        score += map(meld_value, player.melds);
        score -= sum(map(card_value, player.hand));
        return score;
    }

    function error_message(reference, description) {
        return { type: "error", reference: reference, description: description };
    }
    
    var handlers = {
        synchronize: {
            handle: function (game, player, context) {
                var synch = public_state();
                synch.your_id = player.id;
                find_if(property_test("id", synch.your_id), synch.players).hand = player.hand;
                synch.type = "synchronize";
                return { private: [synch, { type: "accept", actions: player.capabilities }] };
            },
        },
        draw: {
            handle: function (game, player, context) {
                var card = null, red_threes = [];
                while () {
                    card = draw();
                    if (!exists(card)) {
                        game_over(null);
                        return {}; // score and shit...
                    } else if (is_red_three(card)) {
                        red_threes.push(card);
                    } else {
                        break;
                    }
                }

                player.hand.push(card);
                player.red_threes.push_all(red_threes);
                
                player.capabilities = ["meld", "discard"];
                return { private: [{ type: "draw", card: card, red_threes: red_threes },
                                   { type: "accept", actions: player.capabilities }],
                         public:  [{ type: "draw", player: player.id, card: unknown_card, red_threes: red_threes }] };
            },
        },
        grab: {
            validate: function (context) {
                return (!exists(context.meld) || is_guid(context.meld)) && is_list(context.using) && all(is_card, context.using);
            },
            handle: function (game, player, context) {
                var meld = null;
                if (is_guid(context.meld)) {
                    meld = find_if(property_test("id", context.meld), player.melds);
                    if (!exists(meld))
                        return { private: [error_message(context, "no such meld (or it isn't yours)")] };
                } else {
                    meld = new_meld();
                }

                var top_of_pile = game.pile.peek() || placeholder_card;
                var cards_added = prepend(top_of_pile, context.using);
                var all_cards_involved = concatenate(meld.cards, cards_added);
                
                if (game.pile_blocked_below === game.pile.length) {
                    return { private: [error_message(context, "there is nothing to grab")] };
                } else if (game.pile_frozen && context.using.length < 2) {
                    return { private: [error_message(context, "the pile is frozen; you need two cards to grab it")] };
                } else if (!cards_make_valid_meld(all_cards_involved)) {
                    return { private: [error_message(context, "that does not make a valid meld")] };
                } else if (!contains_one_to_one(context.using, player.hand, cards_equal)) {
                    return { private: [error_message(context, "you don't have those cards")] };
                } else {
                    // process the grab
                    var cards_grabbed = game.pile.splice(game.pile_blocked_below, game.pile.length-1-game.pile_blocked_below);
                    player.hand.push_all(cards_grabbed);
                    top_of_pile = game.pile.peek() || placeholder_card;
                    
                    player.melds.push_new(meld, identical); // we can use identical because we never copy melds
                    meld.cards.push_all(cards_added);
                    deleet_one_to_one(cards_added, player.hand, cards_equal);

                    player.capabilities = ["meld", "discard"];
                    return { private: [{ type: "grab", cards: cards_grabbed, top_of_pile: top_of_pile }.
                                       { type: "meld", cards: cards_added, meld: meld.id },
                                       { type: "accept", actions: player.capabilities }],
                             public:  [{ type: "grab", player: player.id, cards: map(constantly(unknown_card), cards_grabbed), top_of_pile: top_of_pile },
                                       { type: "meld", player: player.id, meld: meld.id, cards: cards_added }] };
                }
            },
        },
        meld: {
            // TODO: implement something like this some time
/*            schema: {
                meld: ho_and(is_number, is_nonnegative),
                cards: ho_and(is_list, all.curry(is_card)),
            },*/
            validate: function (context) {
                return (!exists(context.meld) || is_guid(context.meld)) && is_list(context.cards) && all(is_card, context.cards);
            },
            handle: function (game, player, context) {
                var meld = null;
                if (is_guid(context.meld)) {
                    meld = find_if(property_test("id", context.meld), player.melds);
                    if (!exists(meld))
                        return { private: [error_message(context, "no such meld (or it isn't yours)")] };
                } else {
                    meld = new_meld();
                }

                var cards_added = context.cards;
                var all_cards_involved = concatenate(meld.cards, cards_added);
                
                if (!cards_make_valid_meld(all_cards_involved)) {
                    return { private: [error_message(context, "that does not make a valid meld")] };
                } else if (!contains_one_to_one(context.cards, player.hand, cards_equal)) {
                    return { private: [error_message(context, "you don't have those cards")] };
                } else {
                    player.melds.push_new(meld, identical);
                    meld.cards.push_all(cards_added);
                    deleet_one_to_one(cards_added, player.hand, cards_equal);

                    player.capabilities = ["meld", "discard"];
                    return { private: [{ type: "meld", cards: cards_added, meld: meld.id },
                                       { type: "accept", actions: player.capabilities }],
                             public:  [{ type: "meld", player: player.id, meld: meld.id, cards: cards_added }] };
                }
            },
        },
        discard: {
            validate: function (context) {
                return is_card(context.card);
            },
            handle: function (game, player, context) {
                if (player.hand.length === 1 && none(is_canasta, player.melds)) {
                    return { private: [error_message(context, "you cannot go out unless you have at least one canasta")] }
                } else if (!contains(context.card, player.hand, cards_equal)) {
                    return { private: [error_message(context, "you don't have that card")] }
                } else {
                    deleet_one(context.card, player.hand, cards_equal);

                    game.pile.push(context.card);
                    if (is_blocking_card(context.card)) {
                        if (is_wildcard(context.card))
                            game.pile_frozen = true;
                        game.pile_blocked_below = game.pile.length;
                    }

                    // after the discard action is completed, check for endgame condition
                    postpone(function () {
                        if (is_empty(player.hand))
                            game_over(player);
                        else
                            turn((game.current_player+1) % game.players.length);
                    });

                    player.capabilities = [];
                    return { private: [{ type: "discard", card: context.card },
                                       { type: "accept", actions: player.capabilities }],
                             public:  [{ type: "discard", player: player.id, card: context.card }] };
                }
            },
        },
    };
    
    fads.registerMessageHandler(function (actions, session) { try {
        if (game.game_over)
            return;

        var player = players_by_session_id[session.id];
        
        if (!player) {
            if (game.players.length == 2)
                return; // already playing
            player = {
                id: generate_guid(),
                session: session,
                capabilities: [],
                hand: [],
                melds: [],
                red_threes: [],
            };
            game.players.push(player);
            players_by_session_id[session.id] = player;
            if (game.players.length === 2)
                play();
            return;
        }

        var private_responses = [],
             public_responses = [];

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];

            var capabilities = concatenate(player.capabilities, "synchronize".words());
            if (!contains(action.type, capabilities)) {
                private_responses.push(error_message(action, "not allowed"));
                break;
            }
            
            var handler = handlers[action.type];
            if (!handler) {
                private_responses.push(error_message(action, "unknown action"));
                break;
            }

            // syntax check if necessary
            if (handler.validate && !handler.validate(action)) {
                private_responses.push(error_message(action, "malformed action"));
                break;
            }

            // XXX: should we break if handler errors?
            var responses = handler.handle(player, action);
            if (responses.private) private_responses.push_all(responses.private);
            if (responses.public)   public_responses.push_all(responses.public);
        }

        if (private_responses.length > 0)
            session.sendMessage(private_responses);
        if (public_responses.length > 0) {
            each(function (player) {
                if (player.session !== session)
                    player.session.sendMessage(public_responses);
            }, game.players);
        }
    } catch(e) {
        console.log("an error occurred in the handling of a request:", e);
        console.log(e.stack);
    }});
});
