# Rock Paper Scissors Brawl 2D

This game idea is based on a prototype I had built several years ago. In the prototype, players would face off in a multiplayer arena against other players in a first person rock-paper-scissors match. Basically, the players would control a 3D character that was either a rock, a piece of paper or scissors. The player can switch between each state (rock, paper or scissors) at will. The game is like a modified version of tag, but the player has to touch their opponent while in the “opposite” state of their opponent (i.e a scissor has to tag a piece of paper to score).

## Server-Side

Server-side software will be responsible for registering player accounts, match making, and hosting games. Although each of these services could be implemented as their own project, it might be best to use a monolithic architecture. 

### Player Accounts

In order to join matches, players must register an account. The player’s account information, at a minimum, should include a valid email, unique username (IGN), and a password. 

### Match Making

There will be two kinds of matches: public and private matches. Public matches can be joined by any registered player while private matches can only be joined by players with a specific code. Registered players should be able to join both public and private matches. 

Public matches can only begin once a minimum number of participants join. This is in contrast to other web-based multiplayer games like Slither.io where matches are continuously in progress. Instead, players seeking public matches will need to be grouped into cohorts and then assigned a game room. Once the match has ended, the cohort and game room will be disbanded.

Private matches can be hosted by registered players. The host player can choose which map the match will take place on. Additionally, these matches are not discoverable (i.e cannot be joined by just anyone like public matches). Instead, the hosting player must share a unique code that other players can use to join the match.

### Hosting Games

The game state for each match will be computed on a centralized server. This server will be responsible for ingesting gameplay commands from users, computing the modified game state, and then transmitting the modified game state to each member of the match.

The game server will have a WebSocket server that will be used to ingest and transmit game data to and from players. Reusing the same WebSocket server for multiple matches will help maximize hardware utilization.

Objects, aka entities, in the game world will be described using the Entity Component System (ECS) design. An entity is a collection of Components which are collections of data that describe certain properties about the entity. For example, the Transform component will contain information about an entity’s position and velocity. When the game server transmits game state to players, it is essentially just transmitting a JSON string that lists all entities and their components in the game scene for a given tick.

## Client-Side
There will be two main parts of the client-side software: the gameview itself and the website in which the gameview is embedded.

### Gameview

To render the game, this project will use ThreeJS. ThreeJS will take care of drawing sprites on screen. The in-game UI will consist of plain HTML, JS and CSS. These tools should be sufficient to describe all of the visual states that can be displayed in the game.

### Web App

The web app will be responsible for providing controls and menus for the player to register, find/host matches, and view information about the game.

