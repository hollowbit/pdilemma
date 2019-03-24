defmodule PdilemmaWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  # channel "room:*", PdilemmaWeb.RoomChannel
  channel "host:*", PdilemmaWeb.GameChannel
  channel "timer:*", PdilemmaWeb.GameChannel
  channel "player:*", PdilemmaWeb.GameChannel

  def connect(params, socket, _connect_info) do
    {:ok, assign(socket, :user_id, params["user_id"])}
  end

  def id(socket), do: "users_socket:#{socket.assigns.user_id}"
end
