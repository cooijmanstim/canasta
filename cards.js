define(["util.js"], function (util) {
    var joker            = { suit: null, rank: "joker" };
    var unknown_card     = { suit: null, rank: "unknown" };
    var placeholder_card = { suit: null, rank: "placeholder" };
    
    var suits = "hearts spades diamonds clubs".words();
    var ranks = "ace two three four five six seven eight nine ten jack queen king".words();

    var deck = concatenate([joker, joker], map(curry(apply, create_card), set_product(ranks, suits)));
    
    function deck() {
        return copy_list(deck);
    }

    function create_card(rank, suit) {
        return { rank: rank, suit: suit };
    }

    function copy_card(card) {
        return create_card(card.rank, card.suit);
    }

    function cards_equal(a, b) {
        return is_card(a) && is_card(b) && a.rank === b.rank && a.suit === b.suit;
    }

    function is_card(card) {
        return card
            && typeof card.rank !== "undefined"
            && typeof card.suit !== "undefined";
    }

    function atomic_card_name(card) {
        if (cards_equal(card, placeholder_card)) return "placeholder";
        if (cards_equal(card, unknown_card)) return "unknown";
        if (card.rank === "joker")  return "joker";
        if (card.rank && card.suit) return card.rank+"_of_"+card.suit;
        throw new Error("unconsidered case in atomic_card_name");
    }


    // for old textual representation
    function card_color(card) {
        return (card.suit === "hearts" || card.suit === "diamonds") ? "red"
            :  (card.suit === "spades" || card.suit === "clubs")    ? "black"
            :  (card.rank === "joker") ? "green" // whatever
            :  "blue";
    }

    function card_suit_symbol(card) {
        if (card.suit) {
            return {
                hearts: "&hearts;",
                diamonds: "&diams;",
                spades: "&spades;",
                clubs: "&clubs;",
            }[card.suit];
        } else {
            return " ";
        }
    }

    function card_rank_symbol(card) {
        if (card.rank)
            return Object.from_plist("ace A two 2 three 3 four 4 five 5 six 6 seven 7 eight 8 nine 9 ten X jack J queen Q king K joker ? unknown X".words())[card.rank];
        else
            return "X";
    }

    function card_in_html(card) {
        if (cards_equal(card, placeholder_card)) return "[]";
        if (cards_equal(card, unknown_card)) return "[]"
        return '<span style="color:'+card_color(card)+'">'+card_suit_symbol(card)+''+card_rank_symbol(card)+'</span>';
    }

    eval(EXPORT("is_card cards_equal atomic_card_name joker unknown_card placeholder_card deck".words()));
});
