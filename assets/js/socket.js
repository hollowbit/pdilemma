// NOTE: The contents of this file will only be executed if
// you uncomment its entry in "assets/js/app.js".

// To use Phoenix channels, the first step is to import Socket,
// and connect at the socket path in "lib/web/endpoint.ex".
//
// Pass the token on params as below. Or remove it
// from the params if you are not using authentication.
import {Socket} from "phoenix"

let socket = new Socket("/socket", {params: {token: window.userToken}})

// When you connect, you'll often need to authenticate the client.
// For example, imagine you have an authentication plug, `MyAuth`,
// which authenticates the session and assigns a `:current_user`.
// If the current user exists you can assign the user's token in
// the connection for use in the layout.
//
// In your "lib/web/router.ex":
//
//     pipeline :browser do
//       ...
//       plug MyAuth
//       plug :put_user_token
//     end
//
//     defp put_user_token(conn, _) do
//       if current_user = conn.assigns[:current_user] do
//         token = Phoenix.Token.sign(conn, "user socket", current_user.id)
//         assign(conn, :user_token, token)
//       else
//         conn
//       end
//     end
//
// Now you need to pass this token to JavaScript. You can do so
// inside a script tag in "lib/web/templates/layout/app.html.eex":
//
//     <script>window.userToken = "<%= assigns[:user_token] %>";</script>
//
// You will need to verify the user token in the "connect/3" function
// in "lib/web/channels/user_socket.ex":
//
//     def connect(%{"token" => token}, socket, _connect_info) do
//       # max_age: 1209600 is equivalent to two weeks in seconds
//       case Phoenix.Token.verify(socket, "user socket", token, max_age: 1209600) do
//         {:ok, user_id} ->
//           {:ok, assign(socket, :user, user_id)}
//         {:error, reason} ->
//           :error
//       end
//     end
//
// Finally, connect to the socket:
socket.connect()

// html elements
let xButton = document.getElementById("x");
let yButton = document.getElementById("y");
let messageBox = document.getElementById("message-box");
let timeBox = document.getElementById("time-box");
let startgameButton = document.getElementById("start-game");
let teamButton = document.getElementById("team-button");
let hostGameButton = document.getElementById("host-game");
let joinGameButton = document.getElementById("join-game");

let team = "t1";
let roomId;


hostGameButton.onclick = (event) => {
  event.preventDefault();

  roomId = prompt("Please enter a room id");

  const channelHost = socket.channel(`host:${roomId}`);
  channelHost.join()
    .receive("ok", resp => { console.log("Started room: ", roomId); })
    .receive("error", resp => { console.log(`Could not create room ${roomId}: `, resp.reason); });

  channelHost.on("player_joined", msg => {
    console.log(`Player joined: ${msg.player_name}`);
  });

  startgameButton.onclick = (event) => {
    event.preventDefault();
    channelHost.push("start_game", {});
  };
};

// Establish connections to channels

joinGameButton.onclick = (event) => {
  event.preventDefault();

  if (!roomId) {
    roomId = prompt("Please enter a room id");
  }

  const name = prompt("Please enter a name");

  const channelPlayer = socket.channel(`player:${roomId}`, {name});
  channelPlayer.join()
    .receive("ok", resp => { 
      console.log("Joined successfully room as player", resp)

      // if response has data, set it in round
      if (resp.round_message) {
        messageBox.innerHTML = resp.message;

        // get selection for team
        let teamSelection = null;
        if (team == "t1") {
          teamSelection = resp.selection_team1;
        } else {
          teamSelection = resp.selection_team2;
        }

        if (teamSelection == "X") {
          xButton.classList.add("selected");
          yButton.classList.remove("selected");
        } else {
          yButton.classList.add("selected");
          xButton.classList.remove("selected");
        }
      } else if (resp.team1_score) {
        messageBox.innerHTML = `Team 1 selected ${resp.selection_team1} and got ${resp.team1_score} (New Total: ${resp.team1_totalscore}) AND Team 2 selected ${resp.selection_team2} and got ${resp.team2_score} (New Total: ${resp.team2_totalscore})`;
      }

    })
    .receive("error", resp => { console.log(`Unable to join room ${roomId}`, resp.reason) })

  channelPlayer.on("game_start", _msg => {
    messageBox.innerHTML = "A new game is about to start..."
    teamButton.style.display = "none"; // hide team button on game start
  });

  channelPlayer.on("game_over", msg => {
    messageBox.innerHTML = `Winner: ${msg.winner} (${msg.wscore}), Loser: ${msg.loser} (${msg.lscore})`;
    teamButton.style.display = "inline"; // show team button again
  });

  channelPlayer.on("round_start", msg => {
    messageBox.innerHTML = `Round ${msg.round}: ${msg.message}`;
  });

  channelPlayer.on("round_end", msg => {
    messageBox.innerHTML = `Team 1 selected ${msg.selection_team1} and got ${msg.score_team1} (New Total: ${msg.total_team1}) AND Team 2 selected ${msg.selection_team2} and got ${msg.score_team2} (New Total: ${msg.total_team2})`;
  });

  channelPlayer.on("selection_changed", msg => {
    if (msg.team == team) {
      if (msg.selection == "X") {
        xButton.classList.add("selected");
        yButton.classList.remove("selected");
      } else {
        yButton.classList.add("selected");
        xButton.classList.remove("selected");
      }
    }
  });

  const channelTimer = socket.channel(`timer:${roomId}`, {});
  channelTimer.join()
    .receive("ok", resp => { console.log("Joined successfully room's timer", resp) })
    .receive("error", resp => { console.log(`Unable to join timer:${roomId}`, resp.reason) })

  channelTimer.on("new_time", msg => {
    timeBox.innerHTML = `Time Left: ${msg.time}s...`;
  });


  // Handle ui events

  teamButton.onclick = (event) => {
    event.preventDefault();

    if (team == "t1") {
      team = "t2";
    } else {
      team = "t1";
    }

    teamButton.innerHTML = team;
  };

  xButton.onclick = (event) => {
    event.preventDefault();
    channelPlayer.push("round_selection", {
      team,
      selection: "X"
    });
  };

  yButton.onclick = (event) => {
    event.preventDefault();
    channelPlayer.push("round_selection", {
      team,
      selection: "Y"
    });
  }

};

export default socket
