import {Socket} from "phoenix"

let socket = new Socket("/socket", {params: {token: window.userToken}})

window.startSocket = (roomId, isHost) => {
  socket.connect()
  let team = null;

  // html elements
  const xButton = document.getElementById("x");
  const yButton = document.getElementById("y");
  const messageBox = $("#message-box");
  const startgameButton = document.getElementById("start-game-button");
  const waitInfo = $("#wait-info");
  const waitStatus = $("#wait-status");

  let timeBox = $("#time-box");

  // Closes popup message box
  function closePopups() {
    timeBox = $("#time-box");
    $(".backdrop").css("display", "none");
    $("#info-box").css("display", "none");
    $("#host-box").css("display", "none");
    $("#round-end-box").css("display", "none");
  }

  // Displays a popup message
  function displayMessage(message) {
    closePopups();
    $("#message-box").text(message);
    $(".backdrop").css("display", "inline");
    $("#info-box").css("display", "inline");
  }

  // Displays a round end message box
  function displayRoundEndMessage(scoreChange, roundMessage, newTotal, theirNewTotal) {
    closePopups();
    $(".backdrop").css("display", "inline");
    $("#round-end-box").css("display", "inline");
    $("#score-change").text(scoreChange);
    $("#score-change").addClass(scoreChange > 0 ? "good" : "bad");
    $("#score-change").removeClass(scoreChange > 0 ? "bad" : "good");
    $("#round-end-message").text(roundMessage);
    $("#new-total").text(`Your new total: ${newTotal}`);
    $("#their-new-total").text(`Their new total: ${theirNewTotal}`);
    //timeBox = $("#round-end-timer");
  }

  const joinAsPlayer = () => {
    // Establish connections to channels
    const channelPlayer = socket.channel(`player:${roomId}`, {});
    channelPlayer.join()
      .receive("ok", resp => { 
        console.log("Joined successfully room as player", resp)
        team = resp.team;
        if (!isHost) {
          const teamName = team == "t1" ? "Team 1" : "Team 2";
          displayMessage(`Welcome ${teamName}! Waiting for host to start...`);
        }
      })
      .receive("error", resp => { console.log(`Unable to join room ${roomId}`, resp.reason) })
    channelPlayer.on("game_start", _msg => {
      closePopups();
			$("#round-message").text("A new game is about to start...");
    });
    channelPlayer.on("game_over", msg => {
      if (msg.wscore < 0) { // everyone had negative score
        displayMessage('Everyone loses! Both teams have negative points.')
      } else
      if (msg.lscore < 0) { // only loser had negative score, everyone still loses
        displayMessage('Everyone loses! All teams must not have negative points.');
      } else
      if (msg.winner == null) { // there was a tie!
        displayMessage(`Tie! No one wins... or everyone wins!`);
      } else
      { // we have a true winner
        if (msg.winner == "t1") {
          displayMessage('Team 1 wins!');
        } else {
          displayMessage('Team 2 wins!');
        }
      }
    });
    channelPlayer.on("round_start", msg => {
      closePopups();
			$("#round-message").text(`Round ${msg.round}: ${msg.message}`);
    });
    channelPlayer.on("round_end", msg => {
      if (team == "t1") {
        displayRoundEndMessage(msg.score_team1, `They selected ${msg.selection_team2} and got ${msg.score_team2} points.`, msg.total_team1, msg.total_team2);
      } else {
        displayRoundEndMessage(msg.score_team2, `They selected ${msg.selection_team1} and got ${msg.score_team1} points.`, msg.total_team2, msg.total_team1);
      }
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
      timeBox.text(`${msg.time}s`);
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
				$(".backdrop").css("display", "inline");
				$("#host-box").css("display", "inline");
        joinAsPlayer();
      })
      .receive("error", resp => { console.log(`Could not create room ${roomId}: `, resp.reason); });
    
    channelHost.on("player_joined", msg => {
      console.log(msg);
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
