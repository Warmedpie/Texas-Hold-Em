function card(suit, rank) {
	/*
	----- Suits -----
		0: Hearts 
		1: Diamonds
		2: Clubs
		3: Spades
	*/
	this.suit = suit;
	
	
	/*
	----- Ranks -----
		1: Ace
		2-10: Two-Ten
		11: Jack
		12: Queen
		13: King
	*/
	this.rank = rank;
}

//Creates a full deck of cards
function generate_deck() {
	var deck = []
	
	for (var suit = 0; suit <= 3; suit++) {
		for (var rank = 1; rank <= 13; rank++) {
			deck.push(new card(suit, rank));
		
		}
	}
	
	return deck;
}

//Picks a card from a deck
function pick_card(deck) {
	
	var index = Math.floor(Math.random()*deck.length);
	var picked_card = deck[index];
	
	deck.splice(index, 1);
	
	return picked_card
}

//Draws a given card on the canvas
function draw_card(ctx, image, card, x, y) {
	var offy = 1;
	if (card.suit == 0) offy = 0;

	var offx = 1;
	if (card.rank == 1) offx = 0;
	ctx.drawImage(image, (card.rank - 1) * 81, (card.suit) * 117, 81, 117, x, y, 81, 117);
}
function draw_card_small(ctx, image, card, x, y) {
	var offy = 1;
	if (card.suit == 0) offy = 0;

	var offx = 1;
	if (card.rank == 1) offx = 0;
	ctx.drawImage(image, (card.rank - 1) * 81, (card.suit) * 117, 81, 117, x, y, 81/2, 117/2);
}


module.exports = { pick_card, generate_deck, card };