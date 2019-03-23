defmodule PdilemmaWeb.PageController do
  use PdilemmaWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def game(conn, %{"room_id" => room_id}) do
    case Pdilemma.Game.does_room_exist(room_id) do
      true -> 
              conn
              |> render("game.html", %{room_id: room_id, is_host: false})
      false -> 
              conn
              |> put_flash(:error, "Room \"#{room_id}\" doesn't exist.")
              |> render("index.html")
    end
  end

  def host(conn, %{"room_id" => room_id}) do
    case Pdilemma.Game.does_room_exist(room_id) do
      true ->
              conn
              |> put_flash(:error, "Room already has a host.")
              |> render("game.html", %{room_id: room_id, is_host: false})
      false ->
              conn
              |> put_flash(:info, "Welcome, host! Start the game when you are ready.")
              |> render("game.html", %{room_id: room_id, is_host: true})
    end
  end

end
