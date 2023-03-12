const layout = document.getElementById("layout");
const integrand = document.getElementById("integrand");
const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const evalBtn = document.getElementById("eval");
const resetBtn = document.getElementById("reset");
const cancelBtn = document.getElementById("cancel");
const integralWrapper = document.getElementById("integralWrapper");
const wrtWrapper = document.getElementById("wrtWrapper");
const mathEval = document.getElementById("mathEval");
const mathEvalResult = document.getElementById("result");
const errorMessageContainer = document.getElementById("errorMessage");
const progressIndicator = document.getElementById("progress");

let worker;
initializeWorker();

const defaultValue = {
  upper_bound: "",
  lower_bound: "",
  variable: "",
};

let integrals = [{ ...defaultValue }];

function renderMathGraphics() {
  MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}

function updateExpression(updateGraphics = true) {
  let expr = "";
  for (let i = 0; i < integrals.length; i++) {
    expr += `int_{${integrals[i].lower_bound}}^{${integrals[i].upper_bound}} `;
  }
  expr += `\\ ${integrand.value}\\ `; // double backslash followed by space inserts a literal space
  for (let i = integrals.length - 1; i >= 0; i--) {
    expr += `d ${integrals[i].variable}\\ `; // double backslash followed by space inserts a literal space
  }

  mathEval.innerHTML = `\`${expr}\``;
}

function updateInputs() {
  integralWrapper.innerHTML = ""; // clears
  wrtWrapper.innerHTML = ""; // clears

  for (let i = 0; i < integrals.length; i++) {
    // integrals
    let integral = document.createElement("div");
    integral.classList.add("integral");

    let upperBound = document.createElement("input");
    upperBound.classList.add("upper");
    upperBound.value = integrals[i].upper_bound;
    let lowerBound = document.createElement("input");
    lowerBound.classList.add("lower");
    lowerBound.value = integrals[i].lower_bound;
    let symbol = document.createElement("p");
    symbol.innerHTML = "`int`"; // integral symbol

    upperBound.addEventListener("change", (e) => {
      integrals[i].upper_bound = e.target.value;
      updateExpression();
      resetGraphics();
    });
    lowerBound.addEventListener("change", (e) => {
      integrals[i].lower_bound = e.target.value;
      updateExpression();
      resetGraphics();
    });

    integral.appendChild(upperBound);
    integral.appendChild(symbol);
    integral.appendChild(lowerBound);

    integralWrapper.appendChild(integral);
  }

  for (let i = integrals.length - 1; i >= 0; i--) {
    // wrt
    let wrt = document.createElement("div");
    wrt.classList.add("wrt");

    let symbol = document.createElement("p");
    symbol.innerHTML = "`d`"; // integral symbol
    let variable = document.createElement("input");
    variable.classList.add("variable");
    variable.value = integrals[i].variable;

    wrt.appendChild(symbol);
    wrt.appendChild(variable);

    variable.addEventListener("change", (e) => {
      integrals[i].variable = e.target.value;
      updateExpression();
      resetGraphics();
    });

    wrtWrapper.appendChild(wrt);
  }
}

integrand.addEventListener("change", (e) => {
  updateExpression();
  resetGraphics();
});

addBtn.addEventListener("click", () => {
  integrals.push({ ...defaultValue });
  updateInputs();
  updateExpression();
  resetGraphics();
});

removeBtn.addEventListener("click", () => {
  if (integrals.length <= 1) return;
  const int = integrals[integrals.length - 1];
  if (int.lower_bound !== "" || int.upper_bound !== "" || int.variable !== "") {
    if (!confirm("Are you sure?")) {
      return;
    }
  }
  integrals.pop();
  updateInputs();
  updateExpression();
  resetGraphics();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Are you sure?")) {
    integrand.value = "";
    integrals = [{ ...defaultValue }];
    updateInputs();
    updateExpression();
    resetGraphics();
  }
});

evalBtn.addEventListener("click", () => {
  // INFO: Evaluate
  resetGraphics();
  worker.postMessage({
    message: "START",
    integrand: integrand.value,
    integrals: integrals,
  });
});

cancelBtn.addEventListener("click", () => {
  worker.terminate();
  evalBtn.disabled = false;
  initializeWorker();
  resetGraphics();
});

function resetGraphics() {
  renderMathGraphics();
  mathEvalResult.innerHTML = "";
  errorMessageContainer.innerHTML = "";
  progressIndicator.value = 0;
}

function initializeWorker() {
  worker = new Worker("worker.js");

  function resetWorker() {
    worker.terminate();
    initializeWorker(); // if aborted, reset create
  }

  worker.addEventListener("message", (event) => {
    console.log(event.data);

    if (event.data.message === "PROGRESS") {
      progressIndicator.value = event.data.progress;
    } else if (event.data.message === "FINISHED") {
      mathEvalResult.innerHTML = `\`~~${event.data.result.toFixed(5)}\``;
      renderMathGraphics();
      resetWorker();
    } else if (event.data.message === "START") {
      resetGraphics();
    }
  });
  worker.addEventListener("error", (e) => {
    console.error(e);
    resetWorker();
    resetGraphics();
    errorMessageContainer.innerHTML = `Something went wrong: ${e.message}`;
  });
}

window.onload = () => {
  updateInputs(false);
  updateExpression(false);
  // don't update graphics on page load (automatically done)
};
