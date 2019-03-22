defmodule PdilemmaWeb.PageController do
  use PdilemmaWeb, :controller

  def index(conn, _params) do
    conn
    |> put_flash(:info, "Welcome to Phoenix, from flash info!")
    |> render("index.html")
  end

  def game(conn, %{"room_id" => room_id}) do
    conn
    |> put_flash(:info, "Welcome! You are in #{room_id}")
    |> render("game.html")
  end
end
