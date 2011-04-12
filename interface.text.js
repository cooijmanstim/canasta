define(["jquery.js", "canasta"], function (jquery, canasta) {
    var element = null;

    function update(state) {
        element.innerHTML = "";
        state.players.forEach(draw_player);
        element.innerHTML += "[]   "+canasta.card_in_html(state.top_of_pile);
    }

    function draw_player(player) {
        draw_cards(player);
        element.innerHTML += "\n";
        draw_red_threes(player);
        element.innerHTML += "   ";
        draw_melds(player);
        element.innerHTML += "\n";
    }

    function draw_cards(player) {
        element.innerHTML += player.hand.map(canasta.card_in_html).join("");
    }

    function draw_red_threes(player) {
        element.innerHTML += player.red_threes.map(canasta.card_in_html).join("");
    }

    function draw_melds(player) {
        player.melds.forEach(function (meld) {
            draw_meld(meld);
            element.innerHTML += "   ";
        });
    }

    function draw_meld(meld) {
        element.innerHTML += meld.map(canasta.card_in_html).join("");
    }
       
    $(document).ready(function () {
        element = document.getElementById("table");
    });

    return eval(EXPORT("update".words()));
});
