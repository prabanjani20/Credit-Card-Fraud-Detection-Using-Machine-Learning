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

document.getElementById("csvFile").addEventListener("change", function (e) {
  if (!e.target.files.length) return;
  Papa.parse(e.target.files[0], {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      const data = results.data;
      renderFeatureImportance(data);
    },
  });
});

function renderFeatureImportance(data) {
  const columns = Object.keys(data[0]);
  const amountCol = columns.find((c) => c.toLowerCase() === "amount");
  const classCol = columns.find((c) => c.toLowerCase() === "class");
  const featureCols = columns.filter((c) => /^v\d+$/i.test(c));

  // Feature Importance
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
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // Correlation Heatmap
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
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );
}
