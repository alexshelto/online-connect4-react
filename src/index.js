
// Alexander Shelton
// Index.js
// TODO: set color for placement or just different symbols



import React from 'react';
import ReactDOM from 'react-dom';
import Peer from 'peerjs';
import './index.css';

const LOBBY_NAME = "hangman";
// const BLUE = 'blue';
// const RED = 'red'; 


function calculateWinner(slots) {
  //Checking for draw
  let filled = 0;
  for(let row = 0; row < slots.length; row++){
    for(let col = 0; col < slots[row].length; col++){
      if(slots[row][col]){filled++;}
      else{break;}  //exit loop on first empty element
    }
  }
  if(filled === slots.length * slots[0].length){return 'draw';}


  //checking vertical
  for(let row = 0; row < slots.length; row++){
    for(let col = 0; col < slots[row].length-3; col++){
      if(slots[row][col] != null && slots[row][col] === slots[row][col+1] && slots[row][col] === slots[row][col+2] && slots[row][col] === slots[row][col+3]){
        return slots[row][col];
      }
    }
  }

  //checking all vertical: 
  for(let col = 0; col < 6; col++){
    for(let row = 0; row < 2; row++) {
      if(slots[row][col] != null && slots[row][col] === slots[row+1][col] && slots[row][col] === slots[row+2][col] && slots[row][col] === slots[row+3][col]){
        return slots[row][col];}
    }
  }

  //checking diaganol: 1
  for(let row = 0; row < slots.length-3; row++){
    for(let col = 0; col < slots[row].length - 3; col++ ){
      if(slots[row][col] != null && slots[row][col] === slots[row+1][col+1] && slots[row][col] === slots[row+2][col+2] && slots[row][col] === slots[row+3][col+3]) {
        return slots[row][col];}
    }
  }

  //checking diaganol: 2
  for(let row = 0; row < slots.length - 3; row++) {
    for(let col = 3; col < slots[row].length; col++) {
      if (slots[row][col] != null && slots[row][col] === slots[row+1][col-1] && slots[row][col] === slots[row+2][col-2] && slots[row][col] === slots[row+3][col-3]){
        return slots[row][col];
    }
  }
  }
  return ; //return if no winner yet
}


  function Slot(props) {
    return (
      <button className="slot" onClick={props.onClick} >
        {props.value}
      </button>
    );
  }

// Function LobbyList:
// Returns a list of 'friends' or users that are on the webpage
function LobbyList(props) {
  const friends = props.friends;
	const listItems = friends.map((number) =>
    <li onClick={() => {document.getElementById('remotepeer').value=number;}} key={number}>{number}</li>
  );
  return (
    <ul>{listItems}</ul>
  );
}


const states = {
  NOT_CONNECTED: "not_connected",
  PLAYER_RED: "player_X", //formarly player x
  PLAYER_BLUE: "player_O" //formarly player o
};



class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      slots : Array(6).fill(0).map(row => new Array(7).fill(null)),
      redIsNext: true,
      peer: new Peer(),
      peer_id: null,
      conn: null,
      connState: states.NOT_CONNECTED,
      inlobby: [],
    };


    this.state.peer.on('open', (id) => {
      this.setState({peer_id: id}); //Assign random peerid to state

      //connecting using peer
      // lconn is RED
      var lconn = this.state.peer.connect(LOBBY_NAME);  //connect peer to the loby. uses the function connect defined later

      //Launched when YOU sucsessfully connected to peer server
      lconn.on('open', () => {            //connecting to the loby
        // console.log("connected to lobby");
        var lobby_query = () => {
          lconn.send("QUERY");    //sending data to peer requesting array of peer object for state: inlobby
          if (this.state.connState === states.NOT_CONNECTED) {
            lconn.send("READY");
          }
          window.setTimeout(lobby_query, 1000);
        }
        lobby_query();
      });


      //Recieving data response from other peer in server
      //Recieved message from sending "QUERY" to lobby to set state
      lconn.on('data', (data) => {
        console.log("setting lobby", data);
        this.setState({inlobby: data});
      });

    }); //end of peer.on('open')



    //Launched when someone sucsessfully joins YOUR peer server
    //user who hosts is blue
    this.state.peer.on('connection', (conn) => {
      console.log("got connection from", conn.peer);

      //If not already connected, set the states for the connection
      if (this.state.conn == null) {
        this.setState({conn: conn, connState: states.PLAYER_BLUE});

        //Blue recieving data:
        conn.on('data', (data) => {
          console.log("handling Red press");
          let redRecievedData = JSON.parse(data);
          if (this.state.redIsNext) {
            // handle (RED)
            console.log("Sending these coords to fakeClick: " + redRecievedData[0] + " , " + redRecievedData[1]);
            this.handleFakeClick(redRecievedData[0], redRecievedData[1]); //number format of data
          }
        });
      }
      //else already connected to user
      else {
        console.log("already connected");
        conn.close();
      }
    });
  }

  // Function places the chip into the lowest possible row
  drop_chip(row,col,slots) {
    let max = 5;
    while(max > row) {
      if(slots[max][col] == null) {
        console.log("gravity fell, leaving while loop");
        break;
      }
      max--;
    }
    return [max, col];
  }



  handleClick(x,y) {
    if (this.state.connState === states.PLAYER_RED && this.state.redIsNext) {    //player x now player RED
      this.handleFakeClick(x,y);
    } else if (this.state.connState === states.PLAYER_BLUE && !this.state.redIsNext) { //was player o
      this.handleFakeClick(x,y);
    }
  }


  handleFakeClick(x,y) {
    var slots = [];
    for(let i = 0; i < this.state.slots.length; i++){slots[i] = this.state.slots[i].slice();}
    let move = this.drop_chip(x,y, this.state.slots);


    if (calculateWinner(slots) || slots[move[0]][move[1]]) {
      console.log('slot taken');
      return;
    }
    let sendData = JSON.stringify(move);
    this.state.conn.send(sendData);
    
    slots[move[0]][move[1]] = this.state.redIsNext? 'X' : 'O';
    this.setState({
      slots: slots,
      redIsNext: !this.state.redIsNext, //changing turn
    });
  }


    renderSlot(row,col, slots) {
      return <Slot
        value={slots[row][col]}
        onClick={() => this.handleClick(row,col)}
      />;
    }

  connect() {
    var rp = document.getElementById("remotepeer").value;
    console.log("connect to", rp);
    var conn = this.state.peer.connect(rp);

    //on connection to client:
    conn.on('open', () => {
      console.log("connection open");
      this.setState({conn: conn, connState: states.PLAYER_RED}); // Assinging connection and player role
    });

    conn.on('data', (data) => {
      let recieved_data = JSON.parse(data);
      console.log("Data recieved: " + recieved_data);
      if (!this.state.redIsNext) {
        // handle O press
        this.handleFakeClick(recieved_data[0], recieved_data[1]);
      }
    });
  }

  render() {
    const winner = calculateWinner(this.state.slots);
    let connstatus = this.state.connState;
    let status;
    if (winner != null) {
      if (winner === 'draw') {
        status = 'Game is a draw';
      } else {
        status = 'Winner: ' + winner;
      }
    } else {
      status = 'Next player: ' + (this.state.redIsNext ? 'X' : 'O');
    }

    var slots = [];
    for(let i = 0; i < this.state.slots.length; i++){slots[i] = this.state.slots[i].slice();}


    return (

      <div>

        <div className="status">{status}</div>

        <div className="board-row">
        {this.renderSlot(0,0, slots)}
        {this.renderSlot(0,1, slots)}
        {this.renderSlot(0,2, slots)}
        {this.renderSlot(0,3, slots)}
        {this.renderSlot(0,4, slots)}
        {this.renderSlot(0,5, slots)}
        {this.renderSlot(0,6, slots)}

        </div>
        <div className="board-row">
        {this.renderSlot(1,0, slots)}
        {this.renderSlot(1,1, slots)}
        {this.renderSlot(1,2, slots)}
        {this.renderSlot(1,3, slots)}
        {this.renderSlot(1,4, slots)}
        {this.renderSlot(1,5, slots)}
        {this.renderSlot(1,6, slots)}
        </div>
        <div className="board-row">
        {this.renderSlot(2,0, slots)}
        {this.renderSlot(2,1, slots)}
        {this.renderSlot(2,2, slots)}
        {this.renderSlot(2,3, slots)}
        {this.renderSlot(2,4, slots)}
        {this.renderSlot(2,5, slots)}
        {this.renderSlot(2,6, slots)}
        </div>
        <div className="board-row">
        {this.renderSlot(3,0, slots)}
        {this.renderSlot(3,1, slots)}
        {this.renderSlot(3,2, slots)}
        {this.renderSlot(3,3, slots)}
        {this.renderSlot(3,4, slots)}
        {this.renderSlot(3,5, slots)}
        {this.renderSlot(3,6, slots)}
        </div>
        <div className="board-row">
        {this.renderSlot(4,0, slots)}
        {this.renderSlot(4,1, slots)}
        {this.renderSlot(4,2, slots)}
        {this.renderSlot(4,3, slots)}
        {this.renderSlot(4,4, slots)}
        {this.renderSlot(4,5, slots)}
        {this.renderSlot(4,6, slots)}
        </div>
        <div className="board-row">
        {this.renderSlot(5,0, slots)}
        {this.renderSlot(5,1, slots)}
        {this.renderSlot(5,2, slots)}
        {this.renderSlot(5,3, slots)}
        {this.renderSlot(5,4, slots)}
        {this.renderSlot(5,5, slots)}
        {this.renderSlot(5,6, slots)}
        </div> 


        <div className="connstatus">{connstatus}</div>

        <div class="peer-id">My peer id is: <span class="id-code">{this.state.peer_id}</span></div>
        <input type="text" placeholder="remote peer id" id="remotepeer" />
        <input class="connect-button" type="submit" value="connect" onClick={() => this.connect()} />
        <div class="lobby">
				<h3>Click a user to challenge</h3>
        <div class="list"><LobbyList friends={this.state.inlobby} /></div>
        </div>
      </div>
    );
  }
}

class Game extends React.Component {
  //invoked after component inserted into tree
  //initializations that require DOM nodes 
  //Initialize network requests
  componentDidMount() {
    console.log("trying to create lobby");

    let peers = {};

    // this may fail unless you are the first player
    // on connection to the server
    var lobby = new Peer(LOBBY_NAME);
    lobby.on('open', function(id) {
      console.log('Lobby peer ID is: ' + id);
    });

    //When someone sucsessfully connects to the lobby (server)
    lobby.on('connection', (conn) => {
      console.log('lobby connection', conn.peer);

      conn.on('data', (data) => {
        console.log("conn on data in Game: " + data);
        //IF data == READY. means that users state is NOT_CONNECTED
        if (data === "READY") { 
          peers[conn.peer] = (new Date()).getTime();
        }
        if (data === "QUERY") { 
          conn.send(Object.keys(peers)); //sends array of object (peers)
        }
      });
    }); //end componenetDidMount

    function expire() {
      for (var k in peers) {
        var now = (new Date()).getTime();
        if (now - peers[k] > 10000) {
          delete peers[k];
        }
      }
      window.setTimeout(expire, 1000); //continuing to call itself to expire clients
    } //end expire

    expire();
  }


  render() {
    return (
      <div className="game">
        <div className="game-board">
          <Board />
        </div>
        <div className="game-info">
          <div>{/* status */}</div>
          <ol>{/* TODO */}</ol>
        </div>
      </div>
    );
  }
} //end GAME

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);

