import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// Utils
const hasEnoughPlayers = state =>
  Object.values(state.players).filter(Boolean).length >= state.minPlayers;
const currentPlayer = state => state.players[state.currentPlayer];
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
const stations = ({ firstStation, lastStation }) =>
  [...Array(lastStation - firstStation + 1)].map((_, i) => firstStation + i);
const recoverInitialState = ({
  firstStation,
  lastStation,
  minPlayers,
  maxPlayers
}) => ({
  firstStation,
  lastStation,
  minPlayers,
  maxPlayers
});

// Game configuration
// States
const BEGIN = "BEGIN";
const SETUP = "SETUP";
const TURN = "TURN";
const TURN_RESULT = "TURN_RESULT";
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
    (ps, _, i) => ({ ...ps, [i]: null }),
    {}
  )
});

const fromSetupToTurnState = state => ({
  ...state,
  tag: TURN,
  currentPlayer: 0,
  players: Object.values(state.players).filter(Boolean)
});

const fromTurnToTurnResultState = state => ({
  ...state,
  tag: TURN_RESULT
});

const fromTurnResultToTurnState = state => ({
  ...state,
  tag: TURN,
  currentPlayer: nextPlayer(state)
});

const fromTurnToOverState = state => ({
  ...state,
  tag: OVER,
  winner: winner(state)
});

const fromOverToTurnState = state => ({
  ...recoverInitialState(state),
  tag: TURN,
  currentPlayer: 0,
  secretStation: secretStation(state),
  players: state.players.map(player => ({
    ...player,
    station: state.firstStation
  }))
});

const fromOverToBeginState = state => toBeginState(recoverInitialState(state));

// State identities

// just for clarity: stay(state) === state
const id = x => x;
const stay = id;

const updatePlayerAndStay = ({ i, name }, state) => {
  const invalidName = /^\s*$/.test(name);
  const players = {
    ...state.players,
    [i]: invalidName ? null : { name, station: state.firstStation }
  };
  return { ...state, players };
};

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
        : stay(state);
    case TURN + GET_OFF_THE_TRAIN:
      return hasWinner(state)
        ? fromTurnToOverState(state)
        : fromTurnToTurnResultState(state);
    case TURN_RESULT + NEXT_TURN:
      return fromTurnResultToTurnState(state);
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
      stay(state);
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
    return null;
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
    const sendInput = (input, payload) => {
      const addedState = processInput(state, { input, payload });
      const newKeys = Object.keys(addedState);
      const removedState = Object.keys(this.state).reduce(
        (rm, key) =>
          !newKeys.includes(key) ? { ...rm, [key]: undefined } : rm,
        {}
      );
      this.setState({ ...removedState, ...addedState });
    };

    // Inputs
    const setupNewGame = () => sendInput(SETUP_NEW_GAME);
    const beginAgain = () => sendInput(BEGIN_AGAIN);
    const start = () => sendInput(START);
    const playAgain = () => sendInput(PLAY_AGAIN);
    const getOffTheTrain = () => sendInput(GET_OFF_THE_TRAIN);
    const nextTurn = () => sendInput(NEXT_TURN);
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
          <React.Fragment>
            <Keyboard onEnter={setupNewGame} />
            <ul>
              <li>
                You're in a train running from station {state.firstStation} to
                station {state.lastStation}.
              </li>
              <li>
                There is a secret station and you need to get off the train
                there.
              </li>
              <li>
                Be the first one to guess the secret station and win the game!
              </li>
            </ul>
            <div className="control-bar">
              <button
                className="control control-large"
                onClick={setupNewGame}
                tabIndex={-1}
              >
                BEGIN
              </button>
            </div>
            <ul className="small-print">
              <li>Enter: begin the game.</li>
            </ul>
          </React.Fragment>
        )}

        {whenStateIs(SETUP) && (
          <React.Fragment>
            <Keyboard onEnter={start} />
            <ul>
              <li>
                Add at least {state.minPlayers} players to start the game.
              </li>
              <li>You can add up to {state.maxPlayers} players.</li>
            </ul>
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
              <div className="control-bar">
                <button
                  className="control control-large"
                  onClick={start}
                  tabIndex={-1}
                >
                  START
                </button>
              </div>
            )}

            <ul className="small-print">
              {hasEnoughPlayers(state) && <li>Enter: start game.</li>}
            </ul>
          </React.Fragment>
        )}

        {(whenStateIs(TURN) || whenStateIs(TURN_RESULT)) && (
          <React.Fragment>
            {/* from this point onwards is always either TURN or TURN_RESULT */}
            {whenStateIs(TURN) ? (
              <Keyboard
                onEnter={getOffTheTrain}
                onLeft={goLeft}
                onRight={goRight}
                onShiftLeft={goFirst}
                onShiftRight={goLast}
              />
            ) : (
              <Keyboard onEnter={nextTurn} />
            )}
            {state.players.map(({ name, station }, i) => (
              <div
                key={i}
                className={
                  isCurrentPlayer(i) ? "player player-current" : "player"
                }
              >
                <p>
                  {name} is at station {station}
                </p>
                <div className="stations">
                  {stations(state).map(someStation => (
                    <code
                      key={`station-${someStation}`}
                      className={
                        station === someStation
                          ? "station station-current"
                          : "station"
                      }
                    >
                      {someStation}
                      :[
                      {station === someStation ? "X" : " "}]
                    </code>
                  ))}
                </div>

                {whenStateIs(TURN) &&
                  isCurrentPlayer(i) && (
                    <div className="control-bar">
                      <button
                        onClick={goFirst}
                        className="control"
                        tabIndex={-1}
                      >
                        {"<<"}
                      </button>
                      <button
                        onClick={goLeft}
                        className="control"
                        tabIndex={-1}
                      >
                        {"<"}
                      </button>
                      <button
                        onClick={goRight}
                        className="control"
                        tabIndex={-1}
                      >
                        {">"}
                      </button>
                      <button
                        onClick={goLast}
                        className="control"
                        tabIndex={-1}
                      >
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
                  )}
                {whenStateIs(TURN_RESULT) &&
                  isCurrentPlayer(i) && (
                    <React.Fragment>
                      <p className="error">
                        {currentPlayer(state).station < state.secretStation
                          ? "You got off the train too early!"
                          : "You got off the train too late!"}
                      </p>
                      <div className="control-bar">
                        <button
                          className="control control-large"
                          onClick={nextTurn}
                        >
                          NEXT PLAYER
                        </button>
                      </div>
                    </React.Fragment>
                  )}
              </div>
            ))}
            <ul className="small-print">
              {whenStateIs(TURN) ? (
                <React.Fragment>
                  <li>LeftArrow: go to previous station.</li>
                  <li>RightArrow: go to getOffTheTrain station.</li>
                  <li>Shift+LeftArrow: go to goFirst station.</li>
                  <li>Shift+RightArrow: go to goLast station.</li>
                  <li>Enter: get off the train.</li>
                </React.Fragment>
              ) : (
                <li>Enter: Next player.</li>
              )}
            </ul>
          </React.Fragment>
        )}

        {whenStateIs(OVER) && (
          <React.Fragment>
            <Keyboard onEnter={playAgain} onShiftEnter={beginAgain} />
            <h2>Game Over!</h2>
            <p>{state.winner.name} won the game.</p>
            <p>The secret station was station {state.secretStation}.</p>
            <div className="control-bar">
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
          </React.Fragment>
        )}
        {/* <pre>{JSON.stringify(state, null, 2)}</pre> */}
      </React.Fragment>
    );
  }
}

ReactDOM.render(
  <StationRace
    firstStation={1}
    lastStation={7}
    minPlayers={2}
    maxPlayers={4}
  />,
  document.getElementById("root")
);
