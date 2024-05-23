/* Helper functions */

//Define a card
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

//Given a hand of 7 cards, return all combinations of 5 cards
function get_handsof_five(cards) {
	var ignore = [];
	
	for (var i = 0; i < 7; i++) {
		for (var j = i + 1; j < 7; j++) {
			ignore.push([i,j]);
		}
	}
	
	var combos = [];
	
	for (i in ignore) {
		var c = cards.slice();
		c.splice(ignore[i][1],1);
		c.splice(ignore[i][0],1);
		combos.push(c);
	}
	
	return combos;
}

//Helper compare function
function compareNumbers(a, b) {
  return a - b;
}


/*   			Sorting functions    		  */
/*   Used to sort out the type of the hand    */


//Gets sets of pairs, three of a kind, and four of a kind
function fetch_pair_info(cards) {
	const pairs = new Map();
	for (i in cards) {
		var count = pairs.get(cards[i].rank);
		
		if (typeof count === typeof undefined) {
			pairs.set(cards[i].rank, 1);
		}
		else {
			pairs.set(cards[i].rank, count + 1);
		}
	}
	
	return pairs;
}

//returns number of pairs
function find_pairs(cards) {
	var pairs = fetch_pair_info(cards);
	
	var num_pairs = 0;
	for (const [key, value] of pairs.entries()) {
		if (value == 2) num_pairs++;
	}
	
	return num_pairs;
}

//returns number of three of a kinds
function find_triples(cards) {
	pairs = fetch_pair_info(cards);
	
	var num_triples = 0;
	for (const [key, value] of pairs.entries()) {
		if (value == 3) num_triples++;
	}
	
	return num_triples;
}

//Sees if the hand is a straight
function find_strait(cards) {
	var sorted_cards_high = sortCards_AceHigh(cards);
	var sorted_cards_low = sortCards_AceLow(cards);
	
	var i = 0;
	var straight_high = true;
	for (i in sorted_cards_high) {
		if (sorted_cards_high[i] - i != sorted_cards_high[0]) straight_high = false;
		
		i++;
	}
	
	var i = 0;
	var straight_low = true;
	for (i in sorted_cards_low) {
		if (sorted_cards_low[i] - i != sorted_cards_low[0]) straight_low = false;
		
		i++;
	}
	
	return straight_high || straight_low;
	
}

//Sorts card by rank
function sortCards_AceHigh(cards) {
	var ranks = [];
	for (i in cards) {
		//Ace
		if (cards[i].rank == 1) ranks.push(14);
		else ranks.push(cards[i].rank);
	}
	
	return ranks.sort(compareNumbers);
}
function sortCards_AceLow(cards) {
	var ranks = [];
	for (i in cards) {
		ranks.push(cards[i].rank);
	}
	
	return ranks.sort(compareNumbers);
}

//returns number of four of a kinds
function find_quads(cards) {
	var pairs = fetch_pair_info(cards);
	
	var num_quads = 0;
	for (const [key, value] of pairs.entries()) {
		if (value == 4) num_quads++;
	}
	
	return num_quads;
}

//Sees if the hand is a flush
function find_flush(cards) {
	var suit = -1;
	for (i in cards) {
		if (suit == -1) suit = cards[i].suit;
		else if (suit != cards[i].suit) return false;
	}
	
	return true;
}


/*   			ranking functions    		     */
/*   Used to sort out the ranking of the hand    */

//Given a 7 card hand, get your best score
function score_seven(cards) {
	var c = cards.slice();
	
	var score = 0;
	var combos = get_handsof_five(c);
	
	for (i in combos) {
		var s = score_hand(combos[i]);
		if (s > score) score = s;
	}
	
	return score;
	
}

//Generate score for a set of 5 cards
function score_hand(cards) {
	var c = cards.slice();
	
	var sorted_cards_high = sortCards_AceHigh(cards);
	score = sorted_cards_high[4] / 100 + sorted_cards_high[3] / 10000 + sorted_cards_high[2] / 100000 + sorted_cards_high[1] / 1000000 + sorted_cards_high[0] / 10000000;
	
	if (find_strait(c) && find_flush(c)) 				 	return score + 500 + rank_straight(c);
	else if (find_quads(c) == 1) 						 	return score + rank_quads(c);
	else if (find_triples(c) == 1 && find_pairs(c) == 1) 	return score + rank_fullhouse(c);
	else if (find_flush(c)) 							 	return score + rank_flush(c);
	else if (find_strait(c)) 							 	return score + rank_straight(c);
	else if (find_triples(c) == 1) 						 	return score + rank_triples(c);
	else if (find_pairs(c) == 2) 						 	return score + rank_pairs(c);
	else if (find_pairs(c) == 1) 						 	return score + rank_pairs(c);
	
	return rank_highcard(c);
	
}

//Rank a hand with just high card
function rank_highcard(cards) {
	var c = sortCards_AceHigh(cards);
	
	return c[4];
}

//Rank a hand with a pairs
function rank_pairs(cards) {
	var pairs = fetch_pair_info(cards);
	
	var score = 0;
	var pair_count = 0;
	for (const [key, value] of pairs.entries()) {
		//Aces high
		if (value == 2 && key == 1) {
			score += 14;
			pair_count++;
		}
		else if (value == 2) {
			score += key;
			pair_count++;
		}
	}
	
	//15 points for a single pair
	if (pair_count == 1) score += 15;
	//30 points for a two pair
	if (pair_count == 2) score += 30;
	
	return score;
}

//Rank a hand with a three of a kind
function rank_triples(cards) {
	var pairs = fetch_pair_info(cards);
	
	//57 points for a three of a kind
	var score = 57;
	for (const [key, value] of pairs.entries()) {
		//Aces high
		if (value == 3 && key == 1) {
			score += 14;
		}
		else if (value == 3) {
			score += key;
		}
	}
	
	return score;
}

//Rank a straight
function rank_straight(cards) {
	var sorted_cards_high = sortCards_AceHigh(cards);
	var sorted_cards_low = sortCards_AceLow(cards);
	
	//71 points for a straight
	var score = 71;
	
	var i = 0;
	var straight_high = true;
	for (i in sorted_cards_high) {
		if (sorted_cards_high[i] - i != sorted_cards_high[0]) straight_high = false;
		
		i++;
	}
	
	var i = 0;
	var straight_low = true;
	for (i in sorted_cards_low) {
		if (sorted_cards_low[i] - i != sorted_cards_low[0]) straight_low = false;
		
		i++;
	}
	
	//if the straight is high, it will score based on an ace being 14
	if (straight_high) score += sorted_cards_high[4];
	//Otherwise the straight is scored low
	else if (straight_low) score += sorted_cards_low[4];
	
	return score;
}

//Rank a flush
function rank_flush(cards) {
	var sorted_cards_high = sortCards_AceHigh(cards);
	
	//85 points for a flush
	var score = 85;
	
	//When two players have a flush, high card wins. If the same card is high, the score is deturmined by the second lowest, further ties go down the lower cards.
	score += sorted_cards_high[4] + sorted_cards_high[3] / 100 + sorted_cards_high[2] / 1000 + sorted_cards_high[1] / 10000 + sorted_cards_high[0] / 100000;
	
	return score;
}

//Rank full houses
function rank_fullhouse(cards) {
	//100 points for a full house
	var score = 100;
	
	//Higher triples win
	score += rank_triples(cards);
	//Higher double tie breaks
	score += rank_pairs(cards);
	
	return score;
	
}

//rank quads
function rank_quads(cards) {
	var pairs = fetch_pair_info(cards);
	
	//201 points for quads
	var score = 201;
	for (const [key, value] of pairs.entries()) {
		//Aces high
		if (value == 4 && key == 1) {
			score += 14;
		}
		else if (value == 4) {
			score += key;
		}
	}
	
	return score;
}

module.exports = { score_seven, score_hand };