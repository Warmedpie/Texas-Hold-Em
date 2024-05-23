//Create an express server
var express = require('express');
var app = express();
var serv = require('http').Server(app); 

//Import scripts for cards
const deckModule = require('./img/deck.js');
const rankingModule = require('./img/ranks.js');

app.get('/',function(req, res) {
	//This is the main HTML file the serves uses
    res.sendFile(__dirname + '/index.html');
}); 
app.use('/img',express.static(__dirname + '/img'));
 
//Set server port, and log "Server started."
serv.listen(process.env.PORT || 2000);
console.log("Server started.");

//Client list for socket info, and player info
var SOCKET_LIST = {};
var PLAYER_LIST = {}; 

// Game flow control variables
var player_count = 0;
var river = [];
var deck = [];
var river = [];
var pot = 0;
var turn = 0;
var ingame = false;
var needed_bet = 0;
var takenSeats = [false,false,false,false,false,false,false];
var playing_game = [];
var status_message = "";
var everyone_all_in = false;

//This is the player class
var Player = function(id){ 
    var self = { //Player object
        id:id,
		seat:0,
        cards:[],
		money:5000,
		isturn:false,
		hadturn:false,
		amount_bet:0,
		needed_bet:0,
		all_in: false,
    }
    return self;
}

//Socket handing
var io = require('socket.io')(serv,{});

//When a new player joins, creates that sockets connections
io.sockets.on('connection', function(socket){ 
	
	//Give socket id
    socket.id = getRandomInt(1000);
	
	//Add id into the socket list
    SOCKET_LIST[socket.id] = socket;
	
	//Create a player object using the socket id
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
	player_count += 1;
	
	//Put the player in a game seat
	for (i in takenSeats) {
		if (!takenSeats[i]) {
			PLAYER_LIST[socket.id].seat = Number(i);
			takenSeats[i] = true;
			break;
		}
	}
	
	//Tells the client their ID
   	socket.emit('id',{ 
		id:socket.id,
	});
	
	//We are ready to start a new game if:
	//A game is not currenltly running
	//There are atleast 2 players connected
	new_game();
	
	//When a player leaves
    socket.on('disconnect',function(){ 
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
		player_count -= 1;
		
		//Update the game state to reflect the player that has disconected
		on_update();
    });
	
	//When a player bets
	socket.on('bet',function(data) {

		//Unpack bet/ player information
		//We want to make sure we parse it into a number
		var bet = Number(data.bet);
		var id = Number(data.id);
		player = PLAYER_LIST[id];
		
		//Make sure the player is sitting in the correct seat
		if (turn == player.seat) {
			//99999 is set to fold
			if (bet != 99999) {
				//Increase the pot
				pot += bet;
				
				//Update tracking information and money information for the player
				player.amount_bet += bet;
				player.money -= bet;
				player.hadturn = true;
				
				//Check is player is all in
				if (player.money <= 0) player.all_in = true;
				
				//Update status message for players
				status_message = "Seat " + player.seat + " bets " + bet + "$";

				//Update information for raise (and status message)
				if (player.amount_bet > needed_bet) {
					needed_bet = player.amount_bet;
					
					status_message = "Seat " + player.seat + " raise bets " + bet + "$";
				}
				
				//Update message for all in
				if (player.all_in) {
					status_message = "Seat " + player.seat + " all ins " + bet + "$";
				}
				
				console.log(status_message);
				
			}
			//Fold
			else {
				//Update message
				status_message = "Seat " + player.seat + " folds";
				
				//Remove player from the table
				var index = playing_game.indexOf(Number(player.seat));
				console.log(index);
				playing_game.splice(index,1);
				
				//If only one player remains, they win
				if (playing_game.length == 1) show_cards();
				
				console.log(status_message);
				console.log(playing_game);
			}
			
			
			update_turn();
			
			if (playing_game.length != 1) on_update();
		}
    });
   
});

function new_game() {
	//make sure more than one person is playing, and game is not running
	if (player_count > 1 && ingame === false) {
		//Create deck
		deck = deckModule.generate_deck();
		river = [];
		
		//set game info
		playing_game = [];
		ingame = true;
		
		//Set turn/bet info
		turn = 0;
		needed_bet = 10;
		pot = 0;
		
		//Setup players
		for(var i in PLAYER_LIST){
			var player = PLAYER_LIST[i];
			
			if (player.money > 0) {
				//Set players bet info
				player.bet = 0;
				player.needed_bet = 0;
				player.amount_bet = 0;
				player.all_in = false;
				player.hadturn = false;
				
				//Deal cards
				player.cards = [];
				player.cards.push(deckModule.pick_card(deck));
				player.cards.push(deckModule.pick_card(deck));
				
				//Add players seat to the table
				playing_game.push(player.seat);
			}
		}
		
		//Update table info
		on_update();
	}
	//if one player is playing, we do not start a new game
	else if (player_count <= 1) {
		ingame = false;
	}
}

function draw_cards() {
	
	//When we draw cards, we want to reset the turns
	for(var i in PLAYER_LIST) {
		var player = PLAYER_LIST[i];
		player.hadturn = false;
	}
	
	//if there are no cards in the river, we flop 3
	if (river.length == 0) {
		river.push(deckModule.pick_card(deck));
		river.push(deckModule.pick_card(deck));
		river.push(deckModule.pick_card(deck));
		
		turn = -1;
		update_turn();
		on_update();
	}
	
	//Otherwise 1 card 
	else if (river.length >= 3 && river.length != 5) {
		river.push(deckModule.pick_card(deck));
		
		turn = -1;
		update_turn();
		on_update();
	}
	
	//If all the cards are on the table, we compute winner.
	else {
		show_cards();
	}

}

function show_cards() {
	
	everyone_all_in = false;
	
	//Make sure game has more than 1 player
	if (player_count > 1 && playing_game.length > 0) {
		
		//Create an array of winning players
		//an array is used over a simple varible incase of push
		var winning_id = [-1];
		var winning_score = [0];
		
		for(var i in PLAYER_LIST){
			var player = PLAYER_LIST[i];
			
			//Make sure play did not fold
			if (playing_game.includes(player.seat)) {
				
				//We want to create an array of cards including the river (copy) and the players hand
				var hand = river.slice();
				hand.push(player.cards[0]);
				hand.push(player.cards[1]);
				
				//We only want to rank hands with 7 cards (if everyone folds before 5 cards are in the river, there wont be 7)
				if (hand.length == 7) {
					var score = rankingModule.score_seven(hand);
					console.log(score);
					
					if (score > winning_score) {
						winning_score = [score];
						winning_id = [player.id];
					}
				}
				//Since the hand did not have 7 cards, we know all other players fold
				else {
					winning_id = [player.id];
					break;
				}
			}
			
		}
		
		//Make sure there is a valid winner
		if (winning_id[0] != -1) {
			
			//Make status message
			status_message = "Seats ";
			for (i in winning_id) {
				PLAYER_LIST[winning_id[i]].money += Number(pot / winning_id.length);
				
				status_message += PLAYER_LIST[winning_id[i]].seat + " ";
				
			}
			
			status_message += "win " + pot + "$";
		}
	}
	
	//Compiles information from players
	var pack = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
		player.isturn = false;
        packer(pack,player);
    }
	
	//Loops through all the clients and sends them the pack
	for(var i in SOCKET_LIST){ 
        var socket = SOCKET_LIST[i];
        socket.emit('post-game_info',pack);
    }
	
	//After 7 seconds, start a new hand
	setTimeout(function() { 
		ingame = false;
		new_game(); 
	}, 7000);
	
}

//Whenever the game state changes, we must send the new state to players
function on_update() {
	var pack = [];
	
	//We need to check if all players have played or all ind
	var new_draw = true;
	
	//creates a pack, adds everything in the PLAYER_LIST inside it
    for (var i in PLAYER_LIST) { 
        var player = PLAYER_LIST[i];
		
		//Update the amount needed to call
		player.needed_bet = needed_bet;
		
		//See if a player still needs to call.
		if (playing_game.includes(player.seat)) {
			if (player.hadturn == false && !player.all_in) {
				new_draw = false;
			}
			else if (player.needed_bet != player.amount_bet) {
				new_draw = false;
			}
		}
		
		//Let the player know its their turn
		if (turn === player.seat) player.isturn = true;
		else player.isturn = false;
		
		//Compiles information from player
        packer(pack,player); 
    }
	
	//Loops through all the clients and sends them the pack
    for(var i in SOCKET_LIST){ 
        var socket = SOCKET_LIST[i];
        socket.emit('game_info',pack);
    }
	
	//Draw cards if needed
	if (new_draw && player_count > 1) {
		draw_cards();
	}
}

//Packs the information into the specified pack to be sent out to the server
function packer(pack,player) { 
	pack.push({
		player_count: player_count,
		id:player.id,
        money:player.money,
		cards:player.cards,
		river:river,
		seat:player.seat,
		isturn:player.isturn,
		amount_bet:player.amount_bet,
		needed_bet:player.needed_bet,
		pot:pot,
		status_message:status_message
    });  
}

//Used to set the turn, does not check for all-in
function update_turn() {
	//Check for all ins
	var is_all_in = false;
	var everyone_is_all_in = true;
	
	//Check for maximum recusion
	var players_checked = 0;
	
	console.log(playing_game);
	while (players_checked <= 10 && (players_checked == 0 || !playing_game.includes(turn) || is_all_in)) {
		turn++;
		if (turn > 7) turn = 0;
		
		//Set all in info
		for (var i in PLAYER_LIST) {
			if (PLAYER_LIST[i].seat == turn) is_all_in = PLAYER_LIST[i].all_in;
		}
		
		if (!is_all_in && playing_game.includes(turn)) everyone_is_all_in = false;
		
		console.log(turn + " " + is_all_in);
		
		players_checked++;
	}
	
	console.log(turn);
	
	if (everyone_is_all_in) {
		everyone_all_in = true;
		while (everyone_all_in) {
			draw_cards();
		}
	}
	
}

//Helper function for IDs
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}