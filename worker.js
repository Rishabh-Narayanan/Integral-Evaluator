// States: START, STOP, FINISHED (result calculated), PROGRESS

self.addEventListener("message", (e) => {
  if (e.data.message === "START") {
    importScripts("evaluatex.js"); // import a script in a web worker
    self.job(e.data.integrals, e.data.integrand);
  }
});

function job(integrals, integrand) {
  const OPTIONS = {
    pi: Math.PI, // uses "PI" but we need "pi" --> now allows for both
  };
  const evalIntegrand = self.evaluatex(integrand, OPTIONS);
  let variables = {};

  const bounds = integrals.map((e) => {
    return {
      upper: self.evaluatex(e.upper_bound, OPTIONS),
      lower: self.evaluatex(e.lower_bound, OPTIONS),
    };
  });

  const NUM_ITERATIONS = Math.max(1e3, Math.pow(10, 8 / integrals.length));

  // visual counter for progress indicator
  let TOTAL_COUNT = Math.pow(NUM_ITERATIONS, integrals.length);
  let CURRENT_COUNT = 0;

  function recurse(index) {
    let sum = 0;
    let upper = bounds[index].upper(variables);
    let lower = bounds[index].lower(variables);

    variables[integrals[index].variable] = 0; // add variable
    const dVar = (upper - lower) / NUM_ITERATIONS;

    if (index < integrals.length - 1) {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const t = i / NUM_ITERATIONS;
        variables[integrals[index].variable] = upper * t + lower * (1 - t); // lerp between upper and lower
        sum += recurse(index + 1) * dVar;
      }
    } else {
      // if inner most integral, then actually evaluate integrand
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const t = i / NUM_ITERATIONS;
        variables[integrals[index].variable] = upper * t + lower * (1 - t); // lerp between upper and lower
        sum += evalIntegrand(variables) * dVar;

        // update counter
        CURRENT_COUNT++;
        if (CURRENT_COUNT % Math.trunc(TOTAL_COUNT / 20) === 0) {
          // every 5%
          self.postMessage({
            message: "PROGRESS",
            progress: CURRENT_COUNT / TOTAL_COUNT,
          });
          // setTimeout(() => {}, 1000);
        }
      }
    }

    return sum;
  }

  let result = recurse(0);
  self.postMessage({ message: "FINISHED", result: result });
  self.postMessage({ message: "TERMINATED" });
}
