import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

const el = document.getElementById("root");

// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
const hashCode = string =>
  string.split("").reduce((hash, char) => {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    return hash & hash;
  }, 0);

// States
const BEGIN = Symbol("BEGIN");
const SETUP = Symbol("SETUP");
const TURN = Symbol("TURN");
const OVER = Symbol("OVER");

// Transitions
const GO_LEFT = Symbol("GO_LEFT");
const GO_RIGHT = Symbol("GO_RIGHT");
const GO_FIRST = Symbol("GO_FIRST");
const GO_LAST = Symbol("GO_LAST");
const NEXT_TURN = Symbol("NEXT_TURN");
const NEW_GAME = Symbol("NEW_GAME");
const PLAY_AGAIN = Symbol("PLAY_AGAIN");

const initialGame = () => ({
  currentPlayer: 0,
  minPlayers: 2,
  maxPlayers: 4,
  firstStation: 0,
  lastStation: 3,
  players: [
    { name: "Player 1", station: 0 }
    // { name: "Player 2", station: 0 },
    // { name: "Player 3", station: 0 },
    // { name: "Player 4", station: 0 }
  ]
});

const newGame = state => ({
  ...state,
  ...initialGame(),
  currentState: SETUP
});

const playAgain = state => ({
  ...state,
  currentPlayer: 0,
  currentState: TURN,
  players: state.players.map(player => ({ ...player, station: 0 }))
});

const nextPlayer = state => (state.currentPlayer + 1) % state.players.length;

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
  state.players = state.players.map((player, i) => {
    if (i === state.currentPlayer) return fn(state, player);
    return player;
  });
  return state;
};

const winner = state =>
  state.players.find(player => player.station === state.lastStation);

const nextTurn = state =>
  winner(state)
    ? { ...state, currentState: OVER }
    : { ...state, currentPlayer: nextPlayer(state) };

const reduce = (state, action) => {
  switch (action) {
    case NEW_GAME:
      return newGame(state);
    case PLAY_AGAIN:
      return playAgain(state);
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

class PlayerEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.defaultName
    };
    this.onNameChange = this.onNameChange.bind(this);
    this.onRevertName = this.onRevertName.bind(this);
  }

  onNameChange(e) {
    e.preventDefault();
    const name = e.target.value;
    this.setState({ name });
  }

  onRevertName(e) {
    e.preventDefault();
    const { defaultName } = this.props;
    this.setState({ name: defaultName });
  }

  render() {
    const { name } = this.state;
    const { defaultName, i } = this.props;
    const isDirty = name !== defaultName;
    const disabled = !isDirty;
    return (
      <div className="editor">
        {i + 1}:{" "}
        <input
          placeholder="player name"
          value={name}
          onChange={this.onNameChange}
        />
        <button className="control control-large" disabled={disabled}>
          SAVE
        </button>
        {isDirty ? (
          <button
            className="control control-large"
            disabled={disabled}
            onClick={this.onRevertName}
          >
            REVERT
          </button>
        ) : null}
      </div>
    );
  }
}

class GameSetup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focusIndex: 0
    };
  }
  render() {
    const { minPlayers, maxPlayers, players } = this.props;
    return (
      <React.Fragment>
        <p>
          Add at least {minPlayers} players to start the game.
          <br />
          You can add up to {maxPlayers} players.
        </p>

        {players.map(({ name }, i) => (
          <PlayerEditor key={hashCode(name)} defaultName={name} i={i} />
        ))}

        {players.length < maxPlayers ? (
          <PlayerEditor i={players.length} />
        ) : null}
        <ul className="small-print">
          <li>Enter: add player.</li>
          {players.length >= minPlayers ? (
            <li>Shift+Enter: start game.</li>
          ) : null}
        </ul>
      </React.Fragment>
    );
  }
}

PlayerEditor.defaultProps = {
  defaultName: ""
};

const makePlayer = currentPlayer => (props, i) => (
  <Player key={i} {...props} isCurrentPlayer={currentPlayer === i} />
);

const update = state => {
  const transition = action => update(reduce(state, action));

  const begin = () => transition(NEW_GAME);
  const again = () => transition(PLAY_AGAIN);
  const next = () => transition(NEXT_TURN);
  const left = () => transition(GO_LEFT);
  const right = () => transition(GO_RIGHT);
  const first = () => transition(GO_FIRST);
  const last = () => transition(GO_LAST);

  const resolveOnEnter = () => {
    switch (state.currentState) {
      case BEGIN:
      case OVER:
        return begin;
      case TURN:
      default:
        return next;
    }
  };

  const uiFromState = () => {
    switch (state.currentState) {
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
        return <GameSetup {...state} />;
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
            <p>Game Over! {winner(state).name} won the game.</p>
            <div>
              <button className="control control-large" onClick={again}>
                PLAY AGAIN
              </button>
              <button className="control control-large" onClick={begin}>
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
            Error: un-implemented state {state.currentState.toString()}
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
    >
      <React.Fragment>
        <h1>Station Race!</h1>
        {uiFromState()}
      </React.Fragment>
    </KeyboardController>,
    el
  );
};

update({ currentState: BEGIN });
