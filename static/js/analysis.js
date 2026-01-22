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

document.addEventListener("DOMContentLoaded", function () {
  const stored = localStorage.getItem("creditcard_csv_data");
  if (stored) {
    const data = JSON.parse(stored);
    updateAnalysisSummary(data);
    renderMathTable(data);
    mathematicalAnalysis(data);
  } else {
    document.getElementById("math-table-container").innerHTML =
      '<p style="color:#ff4136;">No data found. Please upload a CSV file on the Dashboard page first.</p>';
  }
});

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

  document.getElementById("analysis-summary").innerHTML = `
        <ul>
          <li><strong>Total Transactions:</strong> ${total}</li>
          <li><strong>Fraudulent Transactions:</strong> ${fraudCount}</li>
          <li><strong>Legitimate Transactions:</strong> ${legitCount}</li>
          <li><strong>Fraud Rate:</strong> ${fraudRate}%</li>
          <li><strong>Average Fraudulent Transaction Amount:</strong> $${avgFraud}</li>
          <li><strong>Average Legitimate Transaction Amount:</strong> $${avgLegit}</li>
        </ul>
      `;
}

function renderMathTable(data) {
  if (!data || !data.length) {
    document.getElementById("math-table-container").innerHTML =
      '<p style="color:#ff4136;">No data found in file.</p>';
    return;
  }
  const columns = Object.keys(data[0]);
  const classCol = columns.find((c) => c.toLowerCase() === "class");
  const featureCols = columns.filter(
    (c) => /^v\d+$/i.test(c) || ["amount", "id"].includes(c.toLowerCase())
  );

  // Prepare class array for correlation
  const classArr = data.map((row) => row[classCol]);

  // Helper functions
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
    if (sx === 0 || sy === 0) return 0;
    const cov =
      x.reduce((a, xi, i) => a + (xi - mx) * (y[i] - my), 0) / x.length;
    return cov / (sx * sy);
  }
  function min(arr) {
    return Math.min(...arr);
  }
  function max(arr) {
    return Math.max(...arr);
  }

  // Build table rows
  let rows = featureCols
    .map((col) => {
      const arr = data.map((row) => row[col]);
      const m = mean(arr);
      const s = std(arr, m);
      const mn = min(arr);
      const mx = max(arr);
      const c = corr(arr, classArr);
      const highlight =
        col.toLowerCase() === "amount"
          ? ' style="font-weight:bold;background:#e3f2fd;"'
          : "";
      return `<tr${highlight}>
                <td>${col}</td>
                <td>${m.toFixed(5)}</td>
                <td>${s.toFixed(5)}</td>
                <td>${mn.toFixed(5)}</td>
                <td>${mx.toFixed(5)}</td>
                <td>${c.toFixed(5)}</td>
            </tr>`;
    })
    .join("");

  document.getElementById("math-table-container").innerHTML = `
            <table class="math-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Mean</th>
                        <th>Standard Deviation</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Correlation with Class</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
}

function mathematicalAnalysis(data) {
  const keys = Object.keys(data[0]).filter(
    (k) =>
      k !== "Class" &&
      k.toLowerCase() !== "id" &&
      data.some((row) => typeof row[k] === "number")
  );

  const vKeys = keys
    .filter((k) => /^v\d+$/i.test(k))
    .sort((a, b) => {
      const aNum = parseInt(a.replace(/^v/i, ""), 10);
      const bNum = parseInt(b.replace(/^v/i, ""), 10);
      return aNum - bNum;
    });
  const otherKeys = keys.filter(
    (k) => !/^v\d+$/i.test(k) && k.toLowerCase() !== "amount"
  );
  let sortedKeys = [...vKeys, ...otherKeys];

  if (keys.some((k) => k.toLowerCase() === "amount")) {
    sortedKeys = sortedKeys.filter((k) => k.toLowerCase() !== "amount");
    sortedKeys.push("Amount");
  }

  const fraud = data.filter((row) => row["Class"] === 1);
  const legit = data.filter((row) => row["Class"] === 0);

  // Use mean difference as a proxy for feature importance
  let importances = sortedKeys.map((k) => {
    const fraudMean =
      fraud
        .map((r) => +r[k])
        .filter((x) => !isNaN(x))
        .reduce((a, b) => a + b, 0) / (fraud.length || 1);
    const legitMean =
      legit
        .map((r) => +r[k])
        .filter((x) => !isNaN(x))
        .reduce((a, b) => a + b, 0) / (legit.length || 1);
    return {
      feature: k,
      fraudMean,
      legitMean,
      diff: Math.abs(fraudMean - legitMean),
    };
  });

  // Build table rows
  let rows = importances
    .map(
      (row, idx) => `
          <tr${
            row.feature.toLowerCase() === "amount"
              ? ' style="font-weight:bold;background:#e3f2fd;"'
              : ""
          }>
            <td>${row.feature}</td>
            <td>${row.fraudMean.toFixed(5)}</td>
            <td>${row.legitMean.toFixed(5)}</td>
            <td>${row.diff.toFixed(5)}</td>
          </tr>
        `
    )
    .join("");

  // Render styled table
  document.getElementById("feature-table").innerHTML = `
          <table class="math-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Fraudulent Mean</th>
                <th>Legitimate Mean</th>
                <th>Mean Difference</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
}
