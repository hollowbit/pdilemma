defmodule PdilemmaWeb.Router do
  use PdilemmaWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", PdilemmaWeb do
    pipe_through :browser

    get "/", PageController, :index
    get "/:room_id", PageController, :game
    get "/host/:room_id", PageController, :host
  end

  # Other scopes may use custom stacks.
  # scope "/api", PdilemmaWeb do
  #   pipe_through :api
  # end
end
