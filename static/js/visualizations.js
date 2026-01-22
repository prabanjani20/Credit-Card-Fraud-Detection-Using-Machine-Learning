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

// Update your showSection function
function showSection(section, btn) {
  const sections = [
    "barplot",
    "pie",
    "boxplot",
    "classdist",
    "amountdist",
    "timetrends",
    "heatmap",
    "features",
  ];
  sections.forEach((s) => {
    document.getElementById(s + "-section").style.display =
      s === section ? "" : "none";
  });
  // Highlight active button
  document
    .querySelectorAll(".plot-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

document.addEventListener("DOMContentLoaded", function () {
  const stored = localStorage.getItem("creditcard_csv_data");
  if (stored) {
    const data = JSON.parse(stored);
    renderDashboard(data);
    updateAnalysisSummary(data);
    drawFraudPie(data);
    drawFraudBoxPlot(data);
  } else {
    document.body.innerHTML +=
      '<p style="color:#ff4136;">No data found. Please upload a CSV file on the Dashboard page first.</p>';
  }
});

// Analysis summary in Visualizations section with bar plot
function updateAnalysisSummary(data) {
  const total = data.length;
  const frauds = data.filter((row) => row["Class"] === 1);
  const legit = data.filter((row) => row["Class"] === 0);
  const fraudCount = frauds.length;
  const legitCount = legit.length;
  const fraudRate = ((fraudCount / total) * 100).toFixed(4);

  const avgFraud = frauds.length
    ? (
        frauds.map((r) => +r["Amount"]).reduce((a, b) => a + b, 0) /
        frauds.length
      ).toFixed(2)
    : 0;
  const avgLegit = legit.length
    ? (
        legit.map((r) => +r["Amount"]).reduce((a, b) => a + b, 0) / legit.length
      ).toFixed(2)
    : 0;

  // Prepare data for the bar plot
  const barLabels = [
    "Total Transactions",
    "Fraudulent Transactions",
    "Legitimate Transactions",
    "Avg Fraud Amount",
    "Avg Legit Amount",
  ];
  const barValues = [
    total,
    fraudCount,
    legitCount,
    parseFloat(avgFraud),
    parseFloat(avgLegit),
  ];
  const barColors = ["#8884d8", "#ff4136", "#2ecc40", "#ffb347", "#61dafb"];

  Plotly.newPlot(
    "analysis-barplot",
    [
      {
        x: barLabels,
        y: barValues,
        type: "bar",
        marker: { color: barColors },
      },
    ],
    {
      yaxis: { title: "Count / Amount" },
      title: "Key Metrics of Credit Card Transactions",
      height: 350,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    },
    { responsive: true }
  );
}

// Fraudulent vs. Non-Fraudulent Transactions (Pie Chart)
function drawFraudPie(data) {
  const frauds = data.filter((row) => row["Class"] === 1).length;
  const legit = data.length - frauds;
  Plotly.newPlot(
    "fraud-pie",
    [
      {
        values: [frauds, legit],
        labels: ["Fraudulent", "Legitimate"],
        type: "pie",
        marker: { colors: ["#ff4c4c", "#61dafb"] },
      },
    ],
    {
      title: "Fraudulent vs. Non-Fraudulent Transactions (Pie Chart)",
      height: 400,
      showlegend: true,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    },
    { responsive: true }
  );
}

// Draw Box Plot for Fraudulent vs Non-Fraudulent Transaction Amounts
function drawFraudBoxPlot(data) {
  const amountCol = Object.keys(data[0]).find(
    (c) => c.toLowerCase() === "amount"
  );
  const classCol = Object.keys(data[0]).find(
    (c) => c.toLowerCase() === "class"
  );
  const amountsFraud = data
    .filter((row) => row[classCol] == 1)
    .map((row) => row[amountCol]);
  const amountsLegit = data
    .filter((row) => row[classCol] == 0)
    .map((row) => row[amountCol]);

  Plotly.newPlot(
    "fraud-boxplot",
    [
      {
        y: amountsLegit,
        type: "box",
        name: "Legitimate",
        marker: { color: "#61dafb" },
      },
      {
        y: amountsFraud,
        type: "box",
        name: "Fraudulent",
        marker: { color: "#ff4c4c" },
      },
    ],
    {
      title: "Transaction Amounts: Fraudulent vs. Non-Fraudulent (Box Plot)",
      yaxis: { title: "Transaction Amount" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    },
    { responsive: true }
  );
}

// Render the dashboard with various visualizations
function renderDashboard(data) {
  const columns = Object.keys(data[0]);
  const amountCol = columns.find((c) => c.toLowerCase() === "amount");
  const classCol = columns.find((c) => c.toLowerCase() === "class");
  const idCol = columns.find((c) => c.toLowerCase() === "id");
  const featureCols = columns.filter((c) => /^v\d+$/i.test(c));

  // 1. Class Distribution
  const classCounts = data.reduce((acc, row) => {
    acc[row[classCol]] = (acc[row[classCol]] || 0) + 1;
    return acc;
  }, {});
  Plotly.newPlot(
    "class-distribution",
    [
      {
        x: Object.keys(classCounts).map((cl) =>
          cl == 1 ? "Fraudulent" : "Non-Fraudulent"
        ),
        y: Object.values(classCounts),
        type: "bar",
        marker: { color: ["#2ecc40", "#ff4136"] },
      },
    ],
    {
      title: "Transaction Class Distribution",
      xaxis: { title: "Class" },
      yaxis: { title: "Count" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // 2. Transaction Amount Distribution
  const amounts = data.map((row) => row[amountCol]);
  const classes = data.map((row) => row[classCol]);
  Plotly.newPlot(
    "amount-distribution",
    [
      {
        x: amounts.filter((_, i) => classes[i] == 0),
        type: "histogram",
        name: "Non-Fraudulent",
        marker: { color: "#2ecc40" },
        opacity: 0.7,
      },
      {
        x: amounts.filter((_, i) => classes[i] == 1),
        type: "histogram",
        name: "Fraudulent",
        marker: { color: "#ff4136" },
        opacity: 0.7,
      },
    ],
    {
      barmode: "overlay",
      title: "Transaction Amount Distribution",
      xaxis: { title: "Amount" },
      yaxis: { title: "Count" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // 3. Time-Based Trends
  let idBuckets = {};
  data.forEach((row) => {
    let bucket = Math.floor(row[idCol] / 3600);
    if (!idBuckets[bucket]) idBuckets[bucket] = { fraud: 0, nonfraud: 0 };
    if (row[classCol] == 1) idBuckets[bucket].fraud++;
    else idBuckets[bucket].nonfraud++;
  });
  const buckets = Object.keys(idBuckets)
    .map(Number)
    .sort((a, b) => a - b);
  Plotly.newPlot(
    "time-trends",
    [
      {
        x: buckets,
        y: buckets.map((b) => idBuckets[b].nonfraud),
        type: "scatter",
        mode: "lines",
        name: "Non-Fraudulent",
        line: { color: "#2ecc40" },
      },
      {
        x: buckets,
        y: buckets.map((b) => idBuckets[b].fraud),
        type: "scatter",
        mode: "lines",
        name: "Fraudulent",
        line: { color: "#ff4136" },
      },
    ],
    {
      title: "Transactions Over Time (Hourly Buckets)",
      xaxis: { title: "Hour" },
      yaxis: { title: "Count" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // 4. Correlation Heatmap
  function computeCorrelationMatrix(data, features) {
    function mean(arr) {
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    function std(arr, m) {
      return Math.sqrt(
        arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length
      );
    }
    function corr(x, y) {
      const mx = mean(x),
        my = mean(y);
      const sx = std(x, mx),
        sy = std(y, my);
      const cov =
        x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0) / x.length;
      return cov / (sx * sy);
    }
    let matrix = [];
    for (let i = 0; i < features.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < features.length; j++) {
        const xi = data.map((row) => row[features[i]]);
        const xj = data.map((row) => row[features[j]]);
        matrix[i][j] = corr(xi, xj);
      }
    }
    return matrix;
  }
  const heatmapFeatures = [...featureCols, amountCol, classCol];
  const corrMatrix = computeCorrelationMatrix(data, heatmapFeatures);
  Plotly.newPlot(
    "correlation-heatmap",
    [
      {
        z: corrMatrix,
        x: heatmapFeatures,
        y: heatmapFeatures,
        type: "heatmap",
        colorscale: "RdBu",
        zmin: -1,
        zmax: 1,
        colorbar: { title: "Correlation" },
      },
    ],
    {
      title: "Correlation Heatmap",
      xaxis: { side: "top" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // 5. Top Contributing Features
  let fraudRows = data.filter((row) => row[classCol] == 1);
  let nonFraudRows = data.filter((row) => row[classCol] == 0);
  let featureDiffs = featureCols.map((f) => {
    let meanFraud =
      fraudRows.reduce((a, r) => a + r[f], 0) / (fraudRows.length || 1);
    let meanNonFraud =
      nonFraudRows.reduce((a, r) => a + r[f], 0) / (nonFraudRows.length || 1);
    return { feature: f, diff: Math.abs(meanFraud - meanNonFraud) };
  });
  featureDiffs.sort((a, b) => b.diff - a.diff);
  let topFeatures = featureDiffs.slice(0, 10);
  Plotly.newPlot(
    "feature-importance",
    [
      {
        x: topFeatures.map((f) => f.feature),
        y: topFeatures.map((f) => f.diff),
        type: "bar",
        marker: { color: "#0074D9" },
      },
    ],
    {
      title: "Top 10 Features Differentiating Fraudulent Transactions",
      xaxis: { title: "Feature" },
      yaxis: { title: "Mean Difference" },
      height: 400,
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );
}
