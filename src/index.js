import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// Utils

const hasEnoughPlayers = state =>
  Object.values(state.players).filter(Boolean).length >= state.minPlayers;
const nextPlayer = state => (state.currentPlayer + 1) % state.players.length;
const winner = state =>
  state.players.find(player => player.station === state.secretStation);
const hasWinner = state => !!winner(state);
const withCurrentPlayer = fn => state => {
  return {
    ...state,
    players: state.players.map(
      (player, i) => (i === state.currentPlayer ? fn(state, player) : player)
    )
  };
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const secretStation = ({ firstStation, lastStation }) =>
  randInt(firstStation, lastStation);

// Game configuration

// States

const BEGIN = "BEGIN";
const SETUP = "SETUP";
const TURN = "TURN";
const TURN_RESULT = "TURN";
const OVER = "OVER";

// Inputs

const SETUP_NEW_GAME = "SETUP_NEW_GAME";
const UPDATE_PLAYER = "UPDATE_PLAYER";
const START = "START";
const GET_OFF_THE_TRAIN = "GET_OFF_THE_TRAIN";
const NEXT_TURN = "NEXT_TURN";
const GO_LEFT = "GO_LEFT";
const GO_RIGHT = "GO_RIGHT";
const GO_FIRST = "GO_FIRST";
const GO_LAST = "GO_LAST";
const PLAY_AGAIN = "PLAY_AGAIN";
const BEGIN_AGAIN = "BEGIN_AGAIN";

// State transitions

const toBeginState = state => ({
  ...state,
  secretStation: secretStation(state),
  tag: BEGIN
});

const fromBeginToSetupState = state => ({
  ...state,
  tag: SETUP,
  players: [...Array(state.maxPlayers)].reduce(
    (ps, i) => ({ ...ps, [i]: null }),
    {}
  )
});

const fromSetupToTurnState = state => ({
  ...state,
  tag: TURN,
  currentPlayer: 0,
  players: Object.values(state.players).filter(Boolean)
});

const fromTurnToOverState = state => ({
  ...state,
  tag: OVER,
  winner: winner(state)
});

const fromOverToTurnState = state => ({
  ...state,
  tag: TURN,
  currentPlayer: 0,
  secretStation: secretStation(state),
  players: state.players.map(player => ({
    ...player,
    station: state.firstStation
  }))
});

const fromOverToBeginState = ({
  firstStation,
  lastStation,
  minPlayers,
  maxPlayers
}) =>
  toBeginState({
    firstStation,
    lastStation,
    minPlayers,
    maxPlayers
  });

// State identities

// just for clarity
// justStay(state) === state
const id = x => x;
const justStay = id;

const updatePlayerAndStay = ({ i, name }, state) => {
  const invalidName = /^\s*$/.test(name);
  const players = {
    ...state.players,
    [i]: invalidName ? null : { name, station: state.firstStation }
  };
  return { ...state, players };
};

const nextPlayerAndStay = state => ({
  ...state,
  currentPlayer: nextPlayer(state)
});

const goLeftAndStay = withCurrentPlayer(
  (state, player) =>
    player.station > state.firstStation
      ? { ...player, station: player.station - 1 }
      : player
);

const goRightAndStay = withCurrentPlayer(
  (state, player) =>
    player.station < state.lastStation
      ? { ...player, station: player.station + 1 }
      : player
);

const goFirstAndStay = withCurrentPlayer((state, player) => ({
  ...player,
  station: state.firstStation
}));

const goLastAndStay = withCurrentPlayer((state, player) => ({
  ...player,
  station: state.lastStation
}));

// State machine

const processInput = (state, { input, payload }) => {
  switch (state.tag + input) {
    case BEGIN + SETUP_NEW_GAME:
      return fromBeginToSetupState(state);
    case SETUP + UPDATE_PLAYER:
      return updatePlayerAndStay(payload, state);
    case SETUP + START:
      return hasEnoughPlayers(state)
        ? fromSetupToTurnState(state)
        : justStay(state);
    case TURN + GET_OFF_THE_TRAIN:
      return hasWinner(state)
        ? fromTurnToOverState(state)
        : nextPlayerAndStay(state);
    case TURN + GO_LEFT:
      return goLeftAndStay(state);
    case TURN + GO_RIGHT:
      return goRightAndStay(state);
    case TURN + GO_FIRST:
      return goFirstAndStay(state);
    case TURN + GO_LAST:
      return goLastAndStay(state);
    case OVER + PLAY_AGAIN:
      return fromOverToTurnState(state);
    case OVER + BEGIN_AGAIN:
      return fromOverToBeginState(state);
    default:
      justStay(state);
  }
};

// UI

class Keyboard extends React.Component {
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

  handleKeydown(e) {
    const { shiftKey, key } = e;
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
        e.preventDefault();
        onLeft();
        break;
      case "ArrowRight":
        e.preventDefault();
        onRight();
        break;
      case "ShiftArrowLeft":
        e.preventDefault();
        onShiftLeft();
        break;
      case "ShiftArrowRight":
        e.preventDefault();
        onShiftRight();
        break;
      case "Enter":
        e.preventDefault();
        onEnter();
        break;
      case "ShiftEnter":
        e.preventDefault();
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

Keyboard.defaultProps = {
  onLeft: () => {},
  onRight: () => {},
  onShiftLeft: () => {},
  onShiftRight: () => {},
  onEnter: () => {},
  onShiftEnter: () => {}
};

class StationRace extends React.Component {
  constructor(props) {
    super(props);
    this.state = toBeginState(props);
  }
  render() {
    const state = this.state;

    // Utils
    const whenStateIs = tag => state.tag === tag;
    const whenStateIsNot = tag => !whenStateIs(tag);
    const isCurrentPlayer = i => state.currentPlayer === i;
    const sendInput = (input, payload) =>
      this.setState(processInput(state, { input, payload }));

    // Inputs
    const setupNewGame = () => sendInput(SETUP_NEW_GAME);
    const beginAgain = () => sendInput(BEGIN_AGAIN);
    const start = () => sendInput(START);
    const playAgain = () => sendInput(PLAY_AGAIN);
    const getOffTheTrain = () => sendInput(GET_OFF_THE_TRAIN);
    const goLeft = () => sendInput(GO_LEFT);
    const goRight = () => sendInput(GO_RIGHT);
    const goFirst = () => sendInput(GO_FIRST);
    const goLast = () => sendInput(GO_LAST);
    const updatePlayer = i => e =>
      sendInput(UPDATE_PLAYER, { i, name: e.target.value });

    return (
      <React.Fragment>
        <h1>Station Race!</h1>

        {whenStateIsNot(OVER) && (
          <blockquote>
            Get off the train at the secret station to win the game.
          </blockquote>
        )}

        {whenStateIs(BEGIN) && (
          <Keyboard onEnter={setupNewGame}>
            <ul>
              <li>
                You're in a train running from station {state.firstStation} to
                station {state.lastStation}.
              </li>
              <li>
                There is a secret station and you need to get off the train
                there. Be the goFirst one to guess the secret station and win
                the game!
              </li>
            </ul>
            <button
              className="control control-large"
              onClick={setupNewGame}
              tabIndex={-1}
            >
              BEGIN
            </button>
            <ul className="small-print">
              <li>Enter: begin the game.</li>
            </ul>
          </Keyboard>
        )}

        {whenStateIs(SETUP) && (
          <Keyboard onEnter={start}>
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

            {hasEnoughPlayers(state) && (
              <button
                className="control control-large"
                onClick={start}
                tabIndex={-1}
              >
                START
              </button>
            )}

            <ul className="small-print">
              {hasEnoughPlayers(state) && <li>Enter: start game.</li>}
            </ul>
          </Keyboard>
        )}

        {whenStateIs(TURN) && (
          <Keyboard
            onEnter={getOffTheTrain}
            onLeft={goLeft}
            onRight={goRight}
            onShiftLeft={goFirst}
            onShiftRight={goLast}
          >
            {state.players.map(({ name, station }, i) => (
              <div key={i}>
                <code>[{isCurrentPlayer(i) ? "X" : " "}]</code>
                {name} is at station {station}
              </div>
            ))}
            <div className="control-bar">
              <button onClick={goFirst} className="control" tabIndex={-1}>
                {"<<"}
              </button>
              <button onClick={goLeft} className="control" tabIndex={-1}>
                {"<"}
              </button>
              <button onClick={goRight} className="control" tabIndex={-1}>
                {">"}
              </button>
              <button onClick={goLast} className="control" tabIndex={-1}>
                {">>"}
              </button>
              <button
                onClick={getOffTheTrain}
                className="control control-large"
                tabIndex={-1}
              >
                GET OFF THE TRAIN!
              </button>
            </div>
            <ul className="small-print">
              <li>LeftArrow: go to previous station.</li>
              <li>RightArrow: go to getOffTheTrain station.</li>
              <li>Shift+LeftArrow: go to goFirst station.</li>
              <li>Shift+RightArrow: go to goLast station.</li>
              <li>Enter: get off the train.</li>
            </ul>
          </Keyboard>
        )}

        {whenStateIs(OVER) && (
          <Keyboard onEnter={playAgain} onShiftEnter={beginAgain}>
            <h2>Game Over!</h2>
            <p>{state.winner.name} won the game.</p>
            <p>The secret station was station {state.secretStation}.</p>
            <div>
              <button
                className="control control-large"
                onClick={playAgain}
                tabIndex={-1}
              >
                PLAY AGAIN
              </button>
              <button
                className="control control-large"
                onClick={beginAgain}
                tabIndex={-1}
              >
                NEW GAME
              </button>
            </div>
            <ul className="small-print">
              <li>Enter: play playAgain.</li>
              <li>Shift+Enter: play a new game.</li>
            </ul>
          </Keyboard>
        )}
      </React.Fragment>
    );
  }
}

ReactDOM.render(
  <StationRace
    firstStation={1}
    lastStation={5}
    minPlayers={2}
    maxPlayers={4}
  />,
  document.getElementById("root")
);
