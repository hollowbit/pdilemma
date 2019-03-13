defmodule PdilemmaWeb.PageController do
  use PdilemmaWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
