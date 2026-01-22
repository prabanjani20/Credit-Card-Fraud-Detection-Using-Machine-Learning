function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
}

// Close sidebar when clicking outside
document.addEventListener("click", function (event) {
  const sidebar = document.querySelector(".sidebar");
  const menuToggle = document.querySelector(".menu-toggle");

  if (
    sidebar &&
    menuToggle &&
    !sidebar.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

// Handle window resize
window.addEventListener("resize", function () {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar && window.innerWidth >= 1200) {
    sidebar.classList.remove("open");
  }
});

/* ================= SINGLE MODEL (HYBRID) ================= */

document.getElementById("predict-form").onsubmit = async function (e) {
  e.preventDefault();

  const raw = document.getElementById("features").value;
  const features = raw
    .replace(/\n/g, "")
    .split(",")
    .map((v) => Number(v.trim()));

  if (features.length !== 30 || features.some(isNaN)) {
    document.getElementById("result").innerHTML =
      "<span style='color:red'><b>Error:</b> Enter EXACTLY 30 numeric values.</span>";
    return;
  }

  //  READ SELECTED MODEL
  const model = document.getElementById("model-select").value;

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: features,
        model: document.getElementById("model-select").value,
      }),
    });

    if (!res.ok) throw new Error("Prediction failed");

    const data = await res.json();

    //  DYNAMIC OUTPUT BASED ON MODEL
    let html = `
  <b>Prediction:</b> ${data.prediction === 1 ? "Fraudulent" : "Legitimate"}<br>
  <b>Model:</b> ${data.model_used}<br>
  <b>Accuracy:</b> ${(data.accuracy * 100).toFixed(2)}%
`;

    //  FRAUD RISK DISPLAY (USER-FRIENDLY)
    const fraudPercent = data.probability * 100;

    let probText =
      fraudPercent < 0.01
        ? "< 0.01 % (Very Low Risk)"
        : fraudPercent.toFixed(2) + " %";

    html += `<br><b>Fraud Risk:</b> ${probText}`;

    //  OPTIONAL: SHOW MODEL-SPECIFIC PROBABILITIES
    if (data.rf_probability !== undefined) {
      html += `<br><b>RF Probability:</b> ${(data.rf_probability * 100).toFixed(2)} %`;
    }

    if (data.xgb_probability !== undefined) {
      html += `<br><b>XGBoost Probability:</b> ${(data.xgb_probability * 100).toFixed(2)} %`;
    }

    document.getElementById("result").innerHTML = html;
  } catch (err) {
    document.getElementById("result").innerHTML =
      "<span style='color:red'><b>Error:</b> Server not responding.</span>";
  }
};

/* ================= SAMPLE HELPERS (UNCHANGED) ================= */

function loadSampleFraud() {
  document.getElementById("features").value =
    "9064,-3.499107537,0.258555161,-4.489558073,4.853894351,-6.974521545,3.628382091,5.431270921,-1.946733711,-0.775680093,-1.987773188,4.690395666,-6.998042432,1.454011986,-3.738023334,0.317742063,-2.013542681,-5.136135103,-1.183822117,1.663394014,-3.042625757,-1.052368256,0.204816874,-2.11900744,0.170278608,-0.393844118,0.296367194,1.985913218,-0.900451638,1809.68";
}

function loadSampleLegit() {
  document.getElementById("features").value =
    "3756,1.350757382,-0.767437703,-0.944464989,-1.595061785,1.432443287,3.284171247,-1.135628638,0.703558091,0.357023709,0.269818306,1.009895195,-3.172259421,1.873844283,1.418459674,0.263151375,1.537059966,0.446842808,-0.860466472,0.758219283,0.275386238,-0.262242226,-0.912080261,0.058162339,0.921364875,0.347414098,-0.511174316,-0.024878235,0.020000189,68.15";
}

function clearFeatures() {
  document.getElementById("features").value = "";
  document.getElementById("result").innerHTML = "";
  document.getElementById("ensemble-result").innerHTML = "";
}

/* ================= ENSEMBLE FUNCTIONS (UNCHANGED) ================= */

function getFeatures() {
  const text = document.getElementById("features").value;
  return text
    .replace(/\n/g, "")
    .split(",")
    .map((v) => Number(v.trim()));
}
