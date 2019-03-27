defmodule Pdilemma.Game do
  use GenServer
  require Logger

  def start_link(%{room_id: room_id, host_id: host_id}) do
    GenServer.start_link __MODULE__, %{room_id: room_id, host_id: host_id}, name: {:global, room_id}
  end

  def does_room_exist(room_id) do
    case :global.whereis_name(room_id) do
      :undefined -> false
      _ -> true
    end
  end

  def call_player_join(room_id, auth_id) do
    GenServer.call({:global, room_id}, {:player_join, auth_id})
  end

  ## Game Server ##

  def init(%{room_id: room_id, host_id: host_id}) do
    PdilemmaWeb.Endpoint.subscribe "game:#{room_id}", []
    
    # initialize state
    state = %{
      room_id: room_id,
      team1_auth: nil,
      team2_auth: nil,
      host_id: host_id,
      timeout_ref: nil,
      status: :lobby
    }
    {:ok, state}
  end

  # game:* -> start_game
  def handle_info(%{event: "start_game"}, state = %{timeout_ref: timeout_ref, room_id: room_id}) do
    # end current timer, if exists.
    cancel_timeout(timeout_ref)

    # broadcast that new game is starting
    broadcast_gamestart(room_id)

    # reset selections
    broadcast_selectionchange(:t1, :X, room_id)
    broadcast_selectionchange(:t2, :X, room_id)

    # start timeout
    new_state = set_timeout(5, state)

    # update state
    {:noreply, Map.merge(new_state, %{
      status: :ingame,
      round_started: false,
      rounds: [],
      round: 0,
      selection_t1: :X,
      selection_t2: :X
    })}
  end

  ## Timer Updates ##

  # end current round
  def handle_info({:update_time, 0}, state = %{round_started: true, round: round, selection_t1: s1, selection_t2: s2, rounds: rounds, room_id: room_id}) do
    # commit selections for this round
    round_result = %{t1: s1, t2: s2, round: round}
    updated_rounds = rounds ++ [round_result]

    # calculate score for round
    team1_score = get_round_score(round_result, :t1)
    team2_score = get_round_score(round_result, :t2)

    # calculate new total scores
    team1_totalscore = calculate_score(updated_rounds, :t1)
    team2_totalscore = calculate_score(updated_rounds, :t2)

    # broadcast round end event to clients
    broadcast_roundend(team1_score, team2_score, team1_totalscore, team2_totalscore, s1, s2, room_id)

    # start timer until next round
    new_state = set_timeout(5, state)

    # update state to reflect round end
    {:noreply, Map.merge(new_state, %{
      round_started: false,
      team1_score: team1_score,
      team2_score: team2_score,
      team1_totalscore: team1_totalscore,
      team2_totalscore: team2_totalscore,
      rounds: updated_rounds,
      score: %{t1: team1_totalscore, t2: team2_totalscore},
    })}
  end

  # gameover
  def handle_info({:update_time, 0}, state = %{round_started: false, round: 10, score: %{t1: t1_score, t2: t2_score}, room_id: room_id}) do
    # set winner and loser
    { winner, loser, wscore, lscore } = cond do
      t1_score > t2_score -> {:t1, :t2, t1_score, t2_score}
      t2_score > t1_score -> {:t2, :t1, t2_score, t1_score}
      true -> {nil, nil, nil, nil} # Nobody won or lost
    end

    # broadcast game result
    broadcast_gameover(winner, loser, wscore, lscore, room_id)

    # update final state of game
    {:noreply, Map.merge(state, %{
      winner: winner,
      loser: loser,
      status: :lobby
    })}
  end

  # start next round
  def handle_info({:update_time, 0}, state = %{round_started: false, round: round, room_id: room_id}) do
    # update round
    next_round = round + 1

    # broadcast that round is starting
    message = get_round_message(next_round)
    broadcast_roundstart(next_round, message, room_id)

    # set round timeout
    time = get_round_time(next_round)
    new_state = set_timeout(time, state)

    # update state
    {:noreply, Map.merge(new_state, %{
      round_started: true,
      round: next_round
    })}
  end

  # decrease timer until it is up
  def handle_info({:update_time, time}, state) do
    # decrease timer
    time_left = time - 1

    # continue timer, returns new state
    Logger.info(inspect state)
    {:noreply, set_timeout(time_left, state)}
  end

  # game:action -> round_selection
  def handle_info(%{event: "round_selection", payload: %{"team" => team, "selection" => selection}}, state = %{room_id: room_id}) do
    # notify that selection was changed
    broadcast_selectionchange(team, selection, room_id)

    # get selection atom
    selection_atom = case selection do
      "Y" -> :Y
      "X" -> :X
    end

    # update the current selection
    case team do
      "t1" ->
        {:noreply, Map.merge(state, %{
          selection_t1: selection_atom
        })}
      "t2" ->
        {:noreply, Map.merge(state, %{
          selection_t2: selection_atom
        })}
    end
  end

  ## Host ##

  # team 1 join
  def handle_call({:player_join, auth_id}, _from, state = %{status: :lobby, room_id: room_id, team1_auth: nil}) do
    broadcast_playerjoined room_id, "t1"
    {:reply, {:ok, "t1"}, Map.merge(state, %{
      team1_auth: auth_id
    })}
  end
  
  # team 2 join
  def handle_call({:player_join, auth_id}, _from, state = %{status: :lobby, room_id: room_id, team2_auth: nil}) do
    broadcast_playerjoined room_id, "t2"
    {:reply, {:ok, "t2"}, Map.merge(state, %{
      team2_auth: auth_id
    })}
  end

  # team 2 already in lobby
  def handle_call({:player_join, _auth_id}, _form, state = %{status: :lobby}) do
    {:reply, :error, state}
  end

  # already in game
  def handle_call({:player_join, _auth_id}, _from, state = %{status: :ingame}) do
    {:reply, :error, state}
  end

  ## Private Broadcast Functions ##

  defp broadcast_playerjoined(room_id, team) do
    PdilemmaWeb.Endpoint.broadcast! "host:#{room_id}", "player_joined", %{team: team}
  end

  defp broadcast_time(time, room_id) do
    PdilemmaWeb.Endpoint.broadcast! "timer:#{room_id}", "new_time", %{time: time}
  end

  defp broadcast_gamestart(room_id) do
    PdilemmaWeb.Endpoint.broadcast! "player:#{room_id}", "game_start", %{}
  end

  defp broadcast_gameover(winner, loser, wscore, lscore, room_id) do
    PdilemmaWeb.Endpoint.broadcast! "player:#{room_id}", "game_over", %{
      winner: winner,
      loser: loser,
      wscore: wscore,
      lscore: lscore
    }
  end

  defp broadcast_roundstart(round, message, room_id) do
    PdilemmaWeb.Endpoint.broadcast! "player:#{room_id}", "round_start", %{
      round: round,
      message: message
    }
  end

  defp broadcast_roundend(score_team1, score_team2, total_team1, total_team2, selection_team1, selection_team2, room_id) do
    PdilemmaWeb.Endpoint.broadcast! "player:#{room_id}", "round_end", %{
      score_team1: score_team1,
      score_team2: score_team2,
      total_team1: total_team1,
      total_team2: total_team2,
      selection_team1: selection_team1,
      selection_team2: selection_team2
    }
  end

  defp broadcast_selectionchange(team, selection, room_id) do
    PdilemmaWeb.Endpoint.broadcast! "player:#{room_id}", "selection_changed", %{
      team: team,
      selection: selection
    }
  end

  ## Private Game Functions ##

  defp calculate_score([], _team) do
    0
  end

  defp calculate_score([ head | tail ], team) do
    get_round_score(head, team) + calculate_score(tail, team)
  end

  defp set_timeout(time, state = %{room_id: room_id}) do
    # set timeout process
    timeout_ref = Process.send_after self(), {:update_time, time}, 1_000

    # notify clients of time update
    broadcast_time(time, room_id)

    # return updated state
    Map.merge(state, %{
      timeout_ref: timeout_ref,
      timer: time
    })
  end

  defp cancel_timeout(nil), do: :ok
  defp cancel_timeout(ref), do: Process.cancel_timer(ref)

  ## Private Game Settings Functions ##

  defp get_round_score(round, team) do
    this = Map.fetch!(round, team)
    other = Map.fetch!(round, not_team(team))
    multiplier = get_round_multiplier(Map.fetch!(round, :round))

    score = case {this, other} do
      {:Y, :Y} -> 1
      {:X, :Y} -> 2
      {:Y, :X} -> -2
      {:X, :X} -> -1
    end
    score * multiplier
  end

  # Returns the atom for the other team
  defp not_team(team) when team == :t1 do
    :t2
  end

  defp not_team(team) when team == :t2 do
    :t1
  end

  # Gets the score multiplier for the given round
  defp get_round_multiplier(round) do
    case round do
      5 -> 3
      8 -> 5
      10 -> 10
      _ -> 1
    end
  end

  # Gets the time that a given round should last for
  defp get_round_time(round) do
    time = case round do
      r when r in [5, 8, 10] -> 5 * 60 # 5 minutes
      _ -> 60
    end
    #floor time * 0.1
    time
  end

  # Gets a message for the given round, if there are special rules
  defp get_round_message(round) do
    multiplier = get_round_multiplier(round)
    negociation_round = "Send out 1 delegate to negociate. Score is x#{multiplier} this round!"

    case round do
      r when r in [5, 8, 10] -> negociation_round
      _ -> "Scores are as usual this round."
    end
  end

end
