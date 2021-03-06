defmodule PdilemmaWeb.GameChannel do
  use Phoenix.Channel

  ## Channel Joins ##

  def join("player:" <> room_id, _msg, socket = %{id: socket_id}) do
    # make sure the room exists
    case :global.whereis_name(room_id) do
      :undefined -> {:error, %{reason: "This room doesn't exist"}}
      _ -> # try to join room if it exists
        case Pdilemma.Game.call_player_join(room_id, socket_id) do
          :error -> {:error, %{reason: "Cannot join room right now"}}
          {:ok, team} -> {:ok, %{team: team}, socket}
        end
    end
  end

  def join("host:" <> room_id, _msg, socket = %{id: socket_id}) do
    case Pdilemma.Game.start_link(%{room_id: room_id, host_id: socket_id}) do
      {:ok, _pid} -> {:ok, %{reason: "welcome host"}, socket}
      {:error, {:already_started, _pid}} -> {:error, %{reason: "room id is taken"}}
    end
  end

  def join("timer:" <> room_id, _msg, socket) do
    # make sure the room exists
    case :global.whereis_name(room_id) do
      :undefined -> {:error, %{reason: "This room doesn't exist"}}
      _ -> {:ok, socket}
    end
  end

  ## Publish Events ##

  def handle_in("round_start", msg, socket) do
    push socket, "round_start", msg
    {:noreply, socket}
  end

  def handle_in("round_end", msg, socket) do
    push socket, "round_end", msg
    {:noreply, socket}
  end

  def handle_in("game_start", msg, socket) do
    push socket, "game_start", msg
    {:noreply, socket}
  end

  def handle_in("game_over", msg, socket) do
    push socket, "game_over", msg
    {:noreply, socket}
  end

  def handle_in("new_time", msg, socket) do
    push socket, "new_time", msg
    {:noreply, socket}
  end

  def handle_in("selection_change", msg, socket) do
    push socket, "selection_change", msg
    {:noreply, socket}
  end

  def handle_in("player_joined", msg, socket) do
    push socket, "player_joined", msg
    {:noreply, socket}
  end

  ## Subscribe Events ##

  def handle_in("round_selection", msg, socket = %{topic: "player:" <> room_id}) do
    PdilemmaWeb.Endpoint.broadcast "game:#{room_id}", "round_selection", msg
    {:noreply, socket}
  end

  def handle_in("start_game", msg, socket = %{topic: "host:" <> room_id}) do
    PdilemmaWeb.Endpoint.broadcast "game:#{room_id}", "start_game", msg
    {:noreply, socket}
  end

end
