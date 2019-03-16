# Pdilemma

This is a basic Prisoner's Dilemma game, all played online with multiple clients! I started this project to learn how Elixir and Phoenix work.

This repository is more of a sandbox so the code is not very nice or well designed right now. I plan on making a better designed version in the future.

## ToDo List

I'm not done learning yet! Here are some things I want to add to learn more:

- [x] Private rooms: using custom and generated room codes

- [x] Joining rooms mid-game doesn't cause issues

- [ ] Kicking players: host can kick players when in lobby.

- [ ] Spectators: when players join late, they can spectate the game and join in the next round. Spectators can't be kicked.

- [ ] Anti-cheat: only let players see and change their own team's selections and not the other's.

- [ ] Nicer UI: It's very ugly right now (proof of concept for now but it should be more presentable)

## Try it yourself

To start your Phoenix server:

  * Install dependencies with `mix deps.get`
  * Install Node.js dependencies with `cd assets && npm install`
  * Start Phoenix endpoint with `mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser.
