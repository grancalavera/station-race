import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

const el = document.getElementById("root");

const BEGIN = "BEGIN";
const TURN = "TURN";
const OVER = "OVER";

const LEFT = "ArrowLeft";
const RIGHT = "ArrowRight";
const SHIFT_LEFT = "ShiftArrowLeft";
const SHIFT_RIGHT = "ShiftArrowRight";
const ENTER = "Enter";

const GO_LEFT = "goleft";
const GO_RIGHT = "goright";
const GO_FIRST = "gofirst";
const GO_LAST = "golast";
const NEXT_STATE = "nextstate";

const initialState = (currentState = BEGIN) => ({
  currentPlayer: 0,
  currentState,
  game: {
    firstStation: 0,
    lastStation: 3,
    players: [
      { name: "Player 1", station: 0 },
      { name: "Player 2", station: 0 },
      { name: "Player 3", station: 0 },
      { name: "Player 4", station: 0 }
    ]
  }
});

const nextState = state => {
  switch (state.currentState) {
    case BEGIN:
      return { ...state, currentState: TURN };
    case TURN:
      return winner(state)
        ? { ...state, currentState: OVER }
        : {
            ...state,
            currentPlayer: (state.currentPlayer + 1) % state.game.players.length
          };
    case OVER:
      return { ...initialState(TURN) };
    default:
      return state;
  }
};

const withCurrentPlayer = (state, fn) => {
  state.game.players = state.game.players.map((player, i) => {
    if (i === state.currentPlayer) return fn(state, player);
    return player;
  });
  return state;
};

const goRight = (state, player) =>
  player.station < state.game.lastStation
    ? { ...player, station: player.station + 1 }
    : player;

const goLeft = (state, player) =>
  player.station > state.game.firstStation
    ? { ...player, station: player.station - 1 }
    : player;

const goFirst = (state, player) => ({
  ...player,
  station: state.game.firstStation
});

const goLast = (state, player) => ({
  ...player,
  station: state.game.lastStation
});

const reduce = (state, action) => {
  switch (action) {
    case NEXT_STATE:
      return nextState(state);
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

const winner = state => {
  return state.game.players.find(
    player => player.station === state.game.lastStation
  );
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
    const actualKey = shiftKey ? `Shift${key}` : key;
    const { onAction } = this.props;
    switch (actualKey) {
      case LEFT:
        onAction(GO_LEFT);
        break;
      case RIGHT:
        onAction(GO_RIGHT);
        break;
      case SHIFT_LEFT:
        onAction(GO_FIRST);
        break;
      case SHIFT_RIGHT:
        onAction(GO_LAST);
        break;
      case ENTER:
        onAction(NEXT_STATE);
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
  const step = action => update(reduce(state, action));
  const next = () => step(NEXT_STATE);
  const first = () => step(GO_FIRST);
  const left = () => step(GO_LEFT);
  const right = () => step(GO_RIGHT);
  const last = () => step(GO_LAST);

  const uiFromState = () => {
    switch (state.currentState) {
      case BEGIN:
        return (
          <React.Fragment>
            <button onClick={next}>BEGIN</button>
            <p className="small-print">(or hit ENTER to begin)</p>
          </React.Fragment>
        );
      case TURN:
        return (
          <React.Fragment>
            {state.game.players.map(makePlayer(state.currentPlayer))}
            <div>
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
              <button onClick={next} className="control submit">
                DONE
              </button>
            </div>
            <ul className="small-print">
              <li>LeftArrow: go to previous station</li>
              <li>RightArrow: go to next station</li>
              <li>Shift+LeftArrow: go to first station</li>
              <li>Shift+RightArrow: go to last station</li>
              <li>Enter: end your turn</li>
            </ul>
          </React.Fragment>
        );
      case OVER:
        return (
          <React.Fragment>
            <p>Game Over! {winner(state).name} won the game.</p>
            <button onClick={next}>PLAY AGAIN</button>
            <p className="small-print">(or hit ENTER to play again)</p>
          </React.Fragment>
        );
      default:
        return null;
    }
  };
  ReactDOM.render(
    <KeyboardController onAction={step}>{uiFromState()}</KeyboardController>,
    el
  );
};

update(initialState());
