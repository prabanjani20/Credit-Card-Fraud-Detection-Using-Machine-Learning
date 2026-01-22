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
      renderAmountTrends(data);
    },
  });
});

function renderAmountTrends(data) {
  const columns = Object.keys(data[0]);
  const amountCol = columns.find((c) => c.toLowerCase() === "amount");
  const classCol = columns.find((c) => c.toLowerCase() === "class");
  const idCol = columns.find((c) => c.toLowerCase() === "id");

  // Amount Distribution
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
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );

  // Average Amount Over Time
  let idBuckets = {};
  data.forEach((row) => {
    let bucket = Math.floor(row[idCol] / 3600);
    if (!idBuckets[bucket]) idBuckets[bucket] = { sum: 0, count: 0 };
    idBuckets[bucket].sum += row[amountCol];
    idBuckets[bucket].count += 1;
  });
  const buckets = Object.keys(idBuckets)
    .map(Number)
    .sort((a, b) => a - b);
  Plotly.newPlot(
    "avg-amount-trend",
    [
      {
        x: buckets,
        y: buckets.map((b) => idBuckets[b].sum / idBuckets[b].count),
        type: "scatter",
        mode: "lines+markers",
        name: "Average Amount",
        line: { color: "#1976d2" },
      },
    ],
    {
      title: "Average Transaction Amount Over Time (Hourly)",
      xaxis: { title: "Hour" },
      yaxis: { title: "Average Amount" },
      paper_bgcolor: "rgba(255,255,255,0.0)",
      plot_bgcolor: "rgba(255,255,255,0.0)",
    }
  );
}
