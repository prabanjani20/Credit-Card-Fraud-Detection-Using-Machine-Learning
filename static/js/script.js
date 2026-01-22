const overviewProcessing = document.getElementById("overview-processing");
const overviewDesc = document.getElementById("overview-desc");
const successMsg = document.getElementById("success-message");
const overviewMetrics = document.getElementById("overview-metrics");
document.getElementById("csvFile").addEventListener("change", function (e) {
  if (!e.target.files.length) return;
  overviewProcessing.classList.add("active");
  overviewDesc.classList.add("hide");
  setTimeout(() => {
    Papa.parse(e.target.files[0], {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        const data = results.data;
        localStorage.setItem("creditcard_csv_data", JSON.stringify(data));
        showSuccessMessage();
        updateOverview(data);
        overviewProcessing.classList.remove("active");
      },
    });
  }, 100);
});

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

function showSuccessMessage() {
  successMsg.style.display = "block";
  successMsg.textContent = "✅ Data uploaded and processed successfully!";
}

// Overview metrics
function updateOverview(data) {
  const total = data.length;
  const frauds = data.filter((row) => row["Class"] === 1).length;
  const legit = total - frauds;
  overviewMetrics.innerHTML = `
        <ul>
          <li><strong>Total Transactions:</strong> ${total}</li>
          <li><strong>Fraudulent Transactions:</strong> ${frauds}</li>
          <li><strong>Legitimate Transactions:</strong> ${legit}</li>
          <li><strong>Fraud Rate:</strong> ${((frauds / total) * 100).toFixed(
            4
          )}%</li>
        </ul>
      `;
}
