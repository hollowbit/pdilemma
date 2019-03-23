import {Socket} from "phoenix"

let socket = new Socket("/socket", {params: {token: window.userToken}})

window.startSocket = (roomId, isHost) => {
  socket.connect()

  // html elements
  let xButton = document.getElementById("x");
  let yButton = document.getElementById("y");
  let messageBox = document.getElementById("message-box");
  let timeBox = document.getElementById("time-box");
  let startgameButton = document.getElementById("start-game");
  let teamButton = document.getElementById("team-button");

  let team = "t1";
  const name = prompt("Please pick a name:");

  if (isHost) {
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
    startgameButton.style.display = "inline";
  }

  // Establish connections to channels
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
}

export default startSocket
