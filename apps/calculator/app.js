const STORAGE_KEY = "calculator-state-v1";

const displayEl = document.getElementById("display");
const historyEl = document.getElementById("history");
const keysEl = document.querySelector(".keys");

const state = loadState();
render();

keysEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (value) {
    appendValue(value);
  } else if (action === "clear") {
    state.expression = "0";
    state.history = "";
  } else if (action === "delete") {
    state.expression = state.expression.length > 1 ? state.expression.slice(0, -1) : "0";
  } else if (action === "equals") {
    evaluateExpression();
  }

  render();
  saveState();
});

window.addEventListener("keydown", (event) => {
  const valid = "0123456789.+-*/()";
  if (valid.includes(event.key)) {
    appendValue(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    evaluateExpression();
  } else if (event.key === "Backspace") {
    state.expression = state.expression.length > 1 ? state.expression.slice(0, -1) : "0";
  } else if (event.key.toLowerCase() === "c" || event.key === "Escape") {
    state.expression = "0";
    state.history = "";
  } else {
    return;
  }

  render();
  saveState();
});

function appendValue(value) {
  if (state.expression === "0" && value !== ".") {
    state.expression = value;
    return;
  }

  state.expression += value;
}

function evaluateExpression() {
  try {
    const normalized = state.expression.replace(/[^0-9.+\-*/()]/g, "");
    if (!normalized) return;

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${normalized})`)();

    if (!Number.isFinite(result)) {
      state.history = `${state.expression} = Error`;
      state.expression = "0";
      return;
    }

    state.history = `${state.expression} = ${result}`;
    state.expression = String(result);
  } catch {
    state.history = `${state.expression} = Error`;
    state.expression = "0";
  }
}

function render() {
  displayEl.value = state.expression;
  historyEl.textContent = state.history;
}

function loadState() {
  const fallback = { expression: "0", history: "" };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.expression !== "string" || typeof parsed?.history !== "string") {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
