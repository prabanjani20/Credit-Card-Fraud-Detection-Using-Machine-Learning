// PWA Installation and Service Worker Registration
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallStatus();
    this.setupOfflineDetection();
  }

  // Register service worker
  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/static/sw.js")
          .then((registration) => {
            console.log("SW registered: ", registration);
            this.setupUpdatePrompt(registration);
          })
          .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
          });
      });
    }
  }

  // Setup install prompt
  setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener("appinstalled", () => {
      this.isInstalled = true;
      this.hideInstallButton();
      this.showNotification("App installed successfully!", "success");
    });
  }

  // Show install button
  showInstallButton() {
    const installBtn = this.createInstallButton();
    document.body.appendChild(installBtn);
  }

  // Create install button
  createInstallButton() {
    const button = document.createElement("button");
    button.id = "pwa-install-btn";
    button.innerHTML = '<i class="fas fa-download"></i> Install App';
    button.className = "pwa-install-button";

    button.addEventListener("click", () => {
      this.installApp();
    });

    return button;
  }

  // Install app
  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === "accepted") {
        this.showNotification("App will be installed shortly!", "success");
      }

      this.deferredPrompt = null;
      this.hideInstallButton();
    }
  }

  // Hide install button
  hideInstallButton() {
    const installBtn = document.getElementById("pwa-install-btn");
    if (installBtn) {
      installBtn.remove();
    }
  }

  // Check if app is already installed
  checkInstallStatus() {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      this.isInstalled = true;
    }
  }

  // Setup app update prompt
  setupUpdatePrompt(registration) {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          this.showUpdatePrompt();
        }
      });
    });
  }

  // Show update prompt
  showUpdatePrompt() {
    const updatePrompt = document.createElement("div");
    updatePrompt.className = "update-prompt";
    updatePrompt.innerHTML = `
            <div class="update-content">
                <p>New version available!</p>
                <button onclick="window.location.reload()" class="btn-primary">Update</button>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary">Later</button>
            </div>
        `;
    document.body.appendChild(updatePrompt);
  }

  // Setup offline detection
  setupOfflineDetection() {
    window.addEventListener("online", () => {
      this.showNotification("Back online!", "success");
    });

    window.addEventListener("offline", () => {
      this.showNotification(
        "You are offline. Some features may be limited.",
        "warning"
      );
    });
  }

  // Show notification
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `pwa-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }
}

// Initialize PWA Manager
const pwaManager = new PWAManager();

// Offline prediction queue
class OfflinePredictionQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem("predictionQueue") || "[]");
    this.setupSync();
  }

  addToQueue(predictionData) {
    this.queue.push({
      ...predictionData,
      timestamp: Date.now(),
      id: this.generateId(),
    });
    this.saveQueue();
  }

  async processQueue() {
    if (navigator.onLine && this.queue.length > 0) {
      const results = [];

      for (const item of this.queue) {
        try {
          const response = await fetch(item.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            results.push(await response.json());
          }
        } catch (error) {
          console.error("Failed to process queued prediction:", error);
        }
      }

      this.clearQueue();
      return results;
    }
  }

  setupSync() {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready.then((registration) => {
        return registration.sync.register("background-prediction");
      });
    }
  }

  saveQueue() {
    localStorage.setItem("predictionQueue", JSON.stringify(this.queue));
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize offline queue
const offlineQueue = new OfflinePredictionQueue();

// Enhanced prediction with offline support
function enhancedPredict(endpoint, data) {
  if (!navigator.onLine) {
    offlineQueue.addToQueue({ endpoint, data });
    pwaManager.showNotification("Prediction queued for when online", "info");
    return Promise.resolve({ queued: true });
  }

  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .catch((error) => {
      pwaManager.showNotification(
        "Prediction failed. Queued for retry.",
        "warning"
      );
      offlineQueue.addToQueue({ endpoint, data });
      throw error;
    });
}
