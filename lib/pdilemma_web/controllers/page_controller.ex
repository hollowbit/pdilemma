defmodule PdilemmaWeb.PageController do
  use PdilemmaWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def game(conn, %{"room_id" => room_id}) do
    case Pdilemma.Game.does_room_exist(room_id) do
      true -> # join room
              conn
              |> render("game.html", %{room_id: room_id, is_host: false})
      false -> # if room doesn't exist, send back to home page
              conn
              |> put_flash(:error, "Room \"#{room_id}\" doesn't exist.")
              |> render("index.html")
    end
  end

  def host(conn, %{"room_id" => room_id}) do
    case Pdilemma.Game.does_room_exist(room_id) do
      true -> # if room exists already, just join as a normal player
              conn
              |> put_flash(:error, "Room already has a host.")
              |> render("game.html", %{room_id: room_id, is_host: false})
      false -> # room doesn't exist, start as host
              conn
              |> put_flash(:info, "Welcome, host!")
              |> render("game.html", %{room_id: room_id, is_host: true})
    end
  end

end
