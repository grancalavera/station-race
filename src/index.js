import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// Utils

const hasEnoughPlayers = state => state.playerCount >= state.minPlayers;
const nextPlayer = state => (state.currentPlayer + 1) % state.players.length;
const winner = state =>
  state.players.find(player => player.station === state.lastStation);
const hasWinner = state => !!winner(state);
const withCurrentPlayer = fn => state => {
  return {
    ...state,
    players: state.players.map(
      (player, i) => (i === state.currentPlayer ? fn(state, player) : player)
    )
  };
};

// States

const BEGIN = "BEGIN";
const SETUP = "SETUP";
const TURN = "TURN";
const OVER = "OVER";

// Inputs

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

// State transitions

const toBeginState = () => ({ tag: BEGIN });

const fromBeginToSetupState = (minPlayers, maxPlayers) => ({
  tag: SETUP,
  minPlayers,
  maxPlayers,
  playerCount: 0,
  players: [...Array(maxPlayers)].reduce((ps, i) => ({ ...ps, [i]: null }), {})
});

const fromSetupToTurnState = players => ({
  tag: TURN,
  currentPlayer: 0,
  firstStation: 1,
  lastStation: 3,
  players: Object.values(players).filter(Boolean)
});

const fromTurnToOverState = state => ({
  ...state,
  tag: OVER,
  winner: winner(state)
});

const fromOverToTurnState = state => {
  return {
    ...state,
    currentPlayer: 0,
    tag: TURN,
    players: state.players.map(player => ({ ...player, station: 1 }))
  };
};

const fromOverToBeginState = toBeginState;

// State identities

// just for clarity
// justStay(state) === state
const id = x => x;
const justStay = id;

const updatePlayerAndStay = ({ i, name }, state) => {
  const invalidName = /^\s*$/.test(name);
  const players = {
    ...state.players,
    [i]: invalidName ? null : { name, station: 1 }
  };
  const playerCount = Object.values(players).filter(Boolean).length;
  return { ...state, players, playerCount };
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
      return fromBeginToSetupState(2, 4);
    case SETUP + UPDATE_PLAYER:
      return updatePlayerAndStay(payload, state);
    case SETUP + START:
      return hasEnoughPlayers(state)
        ? fromSetupToTurnState(state.players)
        : justStay(state);
    case TURN + NEXT_TURN:
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
      return fromOverToBeginState();
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

Keyboard.defaultProps = {
  onLeft: () => {},
  onRight: () => {},
  onShiftLeft: () => {},
  onShiftRight: () => {},
  onEnter: () => {},
  onShiftEnter: () => {}
};

const StationRace = state => {
  const whenStateIs = tag => state.tag === tag;
  const isCurrentPlayer = i => state.currentPlayer === i;
  const sendInput = (input, payload) =>
    update(processInput(state, { input, payload }));
  const setup = () => sendInput(SETUP_NEW_GAME);
  const beginAgain = () => sendInput(BEGIN_AGAIN);
  const start = () => sendInput(START);
  const again = () => sendInput(PLAY_AGAIN);
  const next = () => sendInput(NEXT_TURN);
  const left = () => sendInput(GO_LEFT);
  const right = () => sendInput(GO_RIGHT);
  const first = () => sendInput(GO_FIRST);
  const last = () => sendInput(GO_LAST);
  const updatePlayer = i => e =>
    sendInput(UPDATE_PLAYER, { i, name: e.target.value });

  return (
    <React.Fragment>
      <h1>Station Race!</h1>

      {whenStateIs(BEGIN) && (
        <Keyboard onEnter={setup}>
          <p>If you can make sense of this game you're half way to winning.</p>
          <button className="control control-large" onClick={setup}>
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
        </Keyboard>
      )}

      {whenStateIs(TURN) && (
        <Keyboard
          onEnter={next}
          onLeft={left}
          onRight={right}
          onShiftLeft={first}
          onShiftRight={last}
        >
          {state.players.map(({ name, station }, i) => (
            <div key={i}>
              <code>[{isCurrentPlayer(i) ? "X" : " "}]</code>
              {name} is at station {station}
            </div>
          ))}
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
            <button onClick={next} className="control control-large">
              DONE
            </button>
          </div>
          <ul className="small-print">
            <li>LeftArrow: go to previous station.</li>
            <li>RightArrow: go to next station.</li>
            <li>Shift+LeftArrow: go to first station.</li>
            <li>Shift+RightArrow: go to last station.</li>
            <li>Enter: end your turn.</li>
          </ul>
        </Keyboard>
      )}

      {whenStateIs(OVER) && (
        <Keyboard onEnter={again} onShiftEnter={beginAgain}>
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
        </Keyboard>
      )}
    </React.Fragment>
  );
};

const el = document.getElementById("root");
const update = state => {
  ReactDOM.render(<StationRace {...state} />, el);
};
update(toBeginState());
