defmodule PdilemmaWeb.GameChannel do
  use Phoenix.Channel

  ## Channel Joins ##

  def join("game:update", _msg, socket) do
    {:ok, socket}
  end

  def join("game:selection", _msg, socket) do
    {:ok, socket}
  end

  def join("game:timer", _msg, socket) do
    {:ok, socket}
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

  ## Subscribe Events ##

  def handle_in("round_selection", msg, socket) do
    PdilemmaWeb.Endpoint.broadcast "game:action", "round_selection", msg
    {:noreply, socket}
  end

  def handle_in("start_game", msg, socket) do
    PdilemmaWeb.Endpoint.broadcast "game:start", "start_game", msg
    {:noreply, socket}
  end

end
