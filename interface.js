define(["jquery.js", "html", "canasta"], function (jquery, html, canasta) {
    eval(IMPORT("canasta"));

    var element = null;
    var currentState = null; // currently reflected state

    $(document).ready(function () {
        element = $("#table");
    });

    function synchronize(newState) {
        if (currentState === null) {
            $(element).empty().append(domify(newState));
            activate();
        } else {
            update(currentState, newState);
        }
        currentState = newState.clone();
    }

    function activate() {
        var selected_cards = [], selected_meld_id = null;

        function resetSelection() {
            // TODO: these should only be reset if the action succeeded
            selected_cards = [];
            selected_meld_id = null;
            $(element).find(".player:last").find(".hand .card").removeClass("selected").end()
                                           .find(".melds .meld").removeClass("selected");
        }

        $(element).find(".player:last")
            .find(".hand").click(function (ev) {
                var elt = $(ev.target);
                if (!elt.hasClass("card"))
                    return;
                var card = elt[0].canasta_card;
                // click toggles presence in the selection
                // XXX: two cards that are cards_equal would cancel each other if we go that route
                // just distinguish by selectedness for now
                if (elt.hasClass("selected")) {
                    deleet_one(card, selected_cards, cards_equal);
                    elt.removeClass("selected");
                } else {
                    selected_cards.push(card);
                    elt.addClass("selected");
                }
            }).end()
            .find(".melds").click(function (ev) {
                // click will usually go to card element, look up the chain to get the meld element (and id)
                var elt = ev.target;
                while (elt !== ev.currentTarget) {
                    if (elt.canasta_meld_id) {
                        selected_meld_id = elt.canasta_meld_id;
                        break;
                    }
                    elt = elt.parentNode;
                }

                // when user selects a meld before grabbing the pile
                if (!contains("meld", currentState.capabilities)) {
                    $(elt).siblings().removeClass("selected");
                    $(elt).addClass("selected");
                    return;
                }

                if (is_empty(selected_cards)) {
                    console.log("select some cards from your hand first.");
                    return;
                }

                // perform the meld
                meld(selected_cards, selected_meld_id);
                resetSelection();
            });
        $(element).find(".center")
            .find(".pile").click(function (ev) {
                if (contains("grab", currentState.capabilities)) {
                    if (is_empty(selected_cards)) {
                        console.log("select some cards from your hand first.");
                        return;
                    }

                    grab(selected_cards, selected_meld_id);
                    resetSelection();
                } else {
                    // discard
                    if (selected_cards.length !== 1) {
                        console.log("first select the one card to discard.");
                        return;
                    }

                    discard(selected_cards[0]);
                    resetSelection();
                }
            }).end()
            .find(".deck").click(function (ev) {
                draw();
                resetSelection();
            });
    }


    // update_*: update parts of our DOM subtree
    function update(oldstate, newstate) {
        var oldself = find_if(property_test("id", oldstate.my_id), oldstate.players);
        var newself = find_if(property_test("id", newstate.my_id), newstate.players);
        var oldopponents = remove(oldself, oldstate.players);
        var newopponents = remove(newself, newstate.players);

        // assuming the order and number of players won't change
        each(update_player, $(element).find(".player"), oldopponents, newopponents);
        update_player($(element).find(".player:last")[0], oldself, newself);

        if (!cards_equal(oldstate.top_of_pile, newstate.top_of_pile))
            $(element).find(".pile").empty().append(domify_card(newstate.top_of_pile));
    }

    function update_player(dom, alt, neu) {
        update_hand($(dom).find(".hand")[0], alt.hand, neu.hand);
        update_melds($(dom).find(".melds")[0], alt.melds, neu.melds);
    }

    function update_hand(dom, alt, neu) {
        if (!tree_equal(alt, neu, cards_equal))
            $(dom).empty().append(domify_cards(neu)); // XXX: could update more fine-grainedly
    }

    function update_red_threes(dom, alt, neu) {
        if (!tree_equal(alt, neu, cards_equal))
            $(dom).empty().append(domify_cards(neu));
    }

    function update_melds(dom, alt, neu) {
        if (!tree_equal(alt, neu, cards_equal)) {
            each(update_meld, $(dom).find(".meld"), alt, neu);
            if (alt.length < neu.length)
                $(dom).append(neu.slice(alt.length).map(domify_meld));
        }
    }

    function update_meld(dom, alt, neu) {
        if (!tree_equal(alt, neu, cards_equal))
            $(dom).empty().append(domify_cards(neu.cards));
    }


    // domify_*: construct the entire DOM subtree from scratch
    function domify(state) {
        var self = find_if(property_test("id", state.my_id), state.players);
        var opponents = remove(self, state.players);
        var elts = map(domify_player, opponents);
        elts.push(domify_center(state));
        elts.push(domify_player(self));
        return elts;
    }

    function domify_player(player) {
        var elt = html.div({ className: "player" }, [domify_hand(player.hand), domify_red_threes(player.red_threes), domify_melds(player.melds)]);
        elt.canasta_player_id = player.id;
        return elt;
    }

    function domify_hand(hand) {
        return html.div({ className: "hand" }, domify_cards(hand));
    }

    function domify_red_threes(red_threes) {
        return html.div({ className: "red_threes" }, domify_cards(red_threes));
    }

    function domify_melds(melds) {
        return html.div({ className: "melds" }, melds.map(domify_meld));
    }

    function domify_meld(meld) {
        var elt = html.div({ className: "meld" }, domify_cards(meld.cards));
        elt.canasta_meld_id = meld.id;
        return elt;
    }

    function domify_cards(cards) {
        return cards.map(domify_card);
    }

    function domify_card(card) {
        var elt = html.div({ className: "card card_"+atomic_card_name(card) });
        elt.canasta_card = card;
        return elt;
    }

    function domify_center(state) {
        return html.div({ className: "center" }, [
            html.div({ className: "pile" }, domify_card(state.top_of_pile)),
            html.div({ className: "deck" }, domify_card(unknown_card)),
        ]);
    }


    return eval(EXPORT("synchronize".words()));
});
