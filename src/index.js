import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

const el = document.getElementById("root");

// State tags
const BEGIN = "BEGIN";
const SETUP = "SETUP";
const TURN = "TURN";
const OVER = "OVER";

// State making functions
const makeBeginState = () => ({ tag: BEGIN });

const makeSetupState = (minPlayers, maxPlayers) => ({
  tag: SETUP,
  minPlayers,
  maxPlayers,
  playerCount: 0,
  players: [...Array(maxPlayers)].reduce((ps, i) => ({ ...ps, [i]: null }), {})
});

const makeTurnState = players => ({
  tag: TURN,
  currentPlayer: 0,
  firstStation: 1,
  lastStation: 3,
  players: Object.values(players).filter(Boolean)
});

const makeOverState = state => ({
  ...state,
  tag: OVER,
  winner: winner(state)
});

// Transitions
const SETUP_NEW_GAME = "SETUP_NEW_GAME";
const UPDATE_PLAYER = "UPDATE_PLAYER";
const START = "START";
const NEXT_TURN = "NEXT_TURN";
const GO_LEFT = "GO_LEFT";
const GO_RIGHT = "GO_RIGHT";
const GO_FIRST = "GO_FIRST";
const GO_LAST = "GO_LAST";
const PLAY_AGAIN = "PLAY_AGAIN";
const BEGIN_AGAIN = "BEGIN_AGAIN";

const updatePlayers = (state, { i, name }) => {
  const invalidName = /^\s*$/.test(name);
  const players = {
    ...state.players,
    [i]: invalidName ? null : { name, station: 0 }
  };
  const playerCount = Object.values(players).filter(Boolean).length;
  return { ...state, players, playerCount };
};

const tryToStartGame = state =>
  state.playerCount >= state.minPlayers ? makeTurnState(state.players) : state;

const nextPlayer = state => (state.currentPlayer + 1) % state.players.length;

const winner = state =>
  state.players.find(player => player.station === state.lastStation);

const nextTurn = state =>
  winner(state)
    ? makeOverState(state)
    : { ...state, currentPlayer: nextPlayer(state) };

const goLeft = (state, player) =>
  player.station > state.firstStation
    ? { ...player, station: player.station - 1 }
    : player;

const goRight = (state, player) =>
  player.station < state.lastStation
    ? { ...player, station: player.station + 1 }
    : player;

const goFirst = (state, player) => ({
  ...player,
  station: state.firstStation
});

const goLast = (state, player) => ({
  ...player,
  station: state.lastStation
});

const withCurrentPlayer = (state, fn) => {
  return {
    ...state,
    players: state.players.map(
      (player, i) => (i === state.currentPlayer ? fn(state, player) : player)
    )
  };
};

const playAgain = state => {
  return {
    ...state,
    currentPlayer: 0,
    tag: TURN,
    players: state.players.map(player => ({ ...player, station: 0 }))
  };
};

const reduce = (state, { type, payload }) => {
  switch (type) {
    case SETUP_NEW_GAME:
      return makeSetupState(2, 4);
    case UPDATE_PLAYER:
      return updatePlayers(state, payload);
    case START:
      return tryToStartGame(state);
    case NEXT_TURN:
      return nextTurn(state);
    case GO_LEFT:
      return withCurrentPlayer(state, goLeft);
    case GO_RIGHT:
      return withCurrentPlayer(state, goRight);
    case GO_FIRST:
      return withCurrentPlayer(state, goFirst);
    case GO_LAST:
      return withCurrentPlayer(state, goLast);
    case PLAY_AGAIN:
      return playAgain(state);
    case BEGIN_AGAIN:
      return makeBeginState();
    default:
      return state;
  }
};

class KeyboardController extends React.Component {
  constructor(props) {
    super(props);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeydown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeydown);
  }

  handleKeydown({ shiftKey, key }) {
    const {
      onLeft,
      onRight,
      onShiftLeft,
      onShiftRight,
      onEnter,
      onShiftEnter
    } = this.props;

    switch (shiftKey ? `Shift${key}` : key) {
      case "ArrowLeft":
        onLeft();
        break;
      case "ArrowRight":
        onRight();
        break;
      case "ShiftArrowLeft":
        onShiftLeft();
        break;
      case "ShiftArrowRight":
        onShiftRight();
        break;
      case "Enter":
        onEnter();
        break;
      case "ShiftEnter":
        onShiftEnter();
        break;
      default:
    }
  }

  render() {
    const { children } = this.props;
    return <React.Fragment>{children}</React.Fragment>;
  }
}

const Player = ({ name, station, isCurrentPlayer }) => (
  <div>
    <code>[{isCurrentPlayer ? "X" : " "}]</code>
    {name} is at station {station}
  </div>
);

const makePlayer = currentPlayer => (props, i) => (
  <Player key={i} {...props} isCurrentPlayer={currentPlayer === i} />
);

const update = state => {
  const transition = (type, payload) =>
    update(reduce(state, { type, payload }));

  const begin = () => transition(SETUP_NEW_GAME);
  const beginAgain = () => transition(BEGIN_AGAIN);
  const start = () => transition(START);
  const again = () => transition(PLAY_AGAIN);
  const next = () => transition(NEXT_TURN);
  const left = () => transition(GO_LEFT);
  const right = () => transition(GO_RIGHT);
  const first = () => transition(GO_FIRST);
  const last = () => transition(GO_LAST);
  const updatePlayer = i => e =>
    transition(UPDATE_PLAYER, { i, name: e.target.value });

  const resolveOnEnter = () => {
    switch (state.tag) {
      case BEGIN:
        return begin;
      case SETUP:
        return start;
      case TURN:
        return next;
      case OVER:
        return again;
      default:
        return () => {};
    }
  };

  const resolveShiftEnter = () => {
    switch (state.tag) {
      case OVER:
        return beginAgain;
      default:
        return () => {};
    }
  };

  const uiFromState = () => {
    switch (state.tag) {
      case BEGIN:
        return (
          <React.Fragment>
            <p>
              If you can make sense of this game you're half way to winning.
            </p>
            <button className="control control-large" onClick={begin}>
              BEGIN
            </button>
            <ul className="small-print">
              <li>Enter: begin the game.</li>
            </ul>
          </React.Fragment>
        );
      case SETUP:
        return (
          <React.Fragment>
            <p>
              Add at least {state.minPlayers} players to start the game.
              <br />
              You can add up to {state.maxPlayers} players.
            </p>

            {[...Array(state.maxPlayers)].map((_, i) => (
              <div key={i} className="editor">
                {i + 1}:{" "}
                <input
                  value={state.players[i] ? state.players[i].name : ""}
                  onChange={updatePlayer(i)}
                />{" "}
              </div>
            ))}
            {state.playerCount >= state.minPlayers ? (
              <button className="control control-large" onClick={start}>
                START
              </button>
            ) : null}

            <ul className="small-print">
              {state.playerCount >= state.minPlayers ? (
                <li>Enter: start game.</li>
              ) : null}
            </ul>
          </React.Fragment>
        );

      case TURN:
        return (
          <React.Fragment>
            {state.players.map(makePlayer(state.currentPlayer))}
            <div className="control-bar">
              <button onClick={first} className="control">
                {"<<"}
              </button>
              <button onClick={left} className="control">
                {"<"}
              </button>
              <button onClick={right} className="control">
                {">"}
              </button>
              <button onClick={last} className="control">
                {">>"}
              </button>
              <button onClick={next} className="control">
                ↵
              </button>
            </div>
            <ul className="small-print">
              <li>LeftArrow: go to previous station.</li>
              <li>RightArrow: go to next station.</li>
              <li>Shift+LeftArrow: go to first station.</li>
              <li>Shift+RightArrow: go to last station.</li>
              <li>Enter: end your turn.</li>
            </ul>
          </React.Fragment>
        );
      case OVER:
        return (
          <React.Fragment>
            <p>Game Over! {state.winner.name} won the game.</p>
            <div>
              <button className="control control-large" onClick={again}>
                PLAY AGAIN
              </button>
              <button className="control control-large" onClick={beginAgain}>
                NEW GAME
              </button>
            </div>
            <ul className="small-print">
              <li>Enter: play again.</li>
              <li>Shift+Enter: play a new game.</li>
            </ul>
          </React.Fragment>
        );
      default:
        return (
          <code className="error">
            Error: un-implemented state {state.tag.toString()}
          </code>
        );
    }
  };

  ReactDOM.render(
    <KeyboardController
      onLeft={left}
      onRight={right}
      onShiftLeft={first}
      onShiftRight={last}
      onEnter={resolveOnEnter()}
      onShiftEnter={resolveShiftEnter()}
    >
      <React.Fragment>
        <h1>Station Race!</h1>
        {uiFromState()}
      </React.Fragment>
    </KeyboardController>,
    el
  );
};

update(makeBeginState());
