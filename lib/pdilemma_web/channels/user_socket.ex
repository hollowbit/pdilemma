defmodule PdilemmaWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  # channel "room:*", PdilemmaWeb.RoomChannel
  channel "host:*", PdilemmaWeb.GameChannel
  channel "timer:*", PdilemmaWeb.GameChannel
  channel "player:*", PdilemmaWeb.GameChannel

  def connect(params, socket, _connect_info) do
    {:ok, socket}
  end

  def id(socket), do: "#{UUID.uuid4()}"
end
