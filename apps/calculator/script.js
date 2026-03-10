const form = document.getElementById("calculatorForm");
const num1Input = document.getElementById("num1");
const num2Input = document.getElementById("num2");
const operatorInput = document.getElementById("operator");
const resultEl = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");

function showResult(message) {
  resultEl.textContent = `Result: ${message}`;
}

function calculate(event) {
  event.preventDefault();

  const rawA = num1Input.value.trim();
  const rawB = num2Input.value.trim();
  const op = operatorInput.value;

  if (rawA === "" || rawB === "") {
    showResult("enter both numbers.");
    return;
  }

  const a = Number(rawA);
  const b = Number(rawB);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    showResult("enter valid numbers.");
    return;
  }

  let result;

  if (op === "+") {
    result = a + b;
  } else if (op === "-") {
    result = a - b;
  } else if (op === "*") {
    result = a * b;
  } else if (op === "/") {
    if (b === 0) {
      showResult("cannot divide by zero.");
      return;
    }
    result = a / b;
  } else {
    showResult("unsupported operator.");
    return;
  }

  showResult(result);
}

function clearCalculator() {
  num1Input.value = "";
  num2Input.value = "";
  operatorInput.value = "+";
  showResult("—");
  num1Input.focus();
}

form.addEventListener("submit", calculate);
clearBtn.addEventListener("click", clearCalculator);
