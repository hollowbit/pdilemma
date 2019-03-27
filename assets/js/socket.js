import {Socket} from "phoenix"

let socket = new Socket("/socket", {params: {token: window.userToken}})

window.startSocket = (roomId, isHost) => {
  socket.connect()

  // html elements
  let xButton = document.getElementById("x");
  let yButton = document.getElementById("y");
  let messageBox = document.getElementById("message-box");
  let timeBox = document.getElementById("time-box");
  let startgameButton = document.getElementById("start-game-button");
  const waitInfo = $("#wait-info");
  const waitStatus = $("#wait-status");

  let team = null;

  const joinAsPlayer = () => {
    // Establish connections to channels
    const channelPlayer = socket.channel(`player:${roomId}`, {});
    channelPlayer.join()
      .receive("ok", resp => { 
        console.log("Joined successfully room as player", resp)
        team = resp.team;
      })
      .receive("error", resp => { console.log(`Unable to join room ${roomId}`, resp.reason) })
    channelPlayer.on("game_start", _msg => {
      messageBox.innerHTML = "A new game is about to start..."
    });
    channelPlayer.on("game_over", msg => {
      messageBox.innerHTML = `Winner: ${msg.winner} (${msg.wscore}), Loser: ${msg.loser} (${msg.lscore})`;
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

  if (isHost) {
    const channelHost = socket.channel(`host:${roomId}`);
    channelHost.join()
      .receive("ok", resp => { 
        console.log("Started room: ", roomId);
        joinAsPlayer();
      })
      .receive("error", resp => { console.log(`Could not create room ${roomId}: `, resp.reason); });
    
    channelHost.on("player_joined", msg => {
      if (msg.team == "t2") {
        waitInfo.text("Player joined.");
        waitStatus.removeClass("wait-pending");
        waitStatus.addClass("wait-done");
        startgameButton.disabled = false;
      }
    });

    startgameButton.onclick = (event) => {
      event.preventDefault();
      channelHost.push("start_game", {});
    };
    startgameButton.style.display = "inline";
  } else {
    joinAsPlayer();
  }

  
}

export default startSocket
