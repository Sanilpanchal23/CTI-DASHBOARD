# Cyber Threat Intelligence (CTI) Dashboard

![GitHub Actions Workflow Status](https://github.com/Sanilpanchal23/CTI-DASHBOARD/actions/workflows/update_threat_data.yml/badge.svg)

A live, automated dashboard that aggregates, processes, and visualizes real-time Cyber Threat Intelligence from multiple open-source feeds. This project serves as a "single pane of glass" for security analysts to gain quick situational awareness of current global cyber threats.

---

## 🌐 Live Demo

**(ADD YOUR GITHUB PAGES URL HERE)**

---

## 📸 Screenshot

*You should replace the link below with a URL to your own screenshot of the finished dashboard!*

![CTI Dashboard Screenshot](https://i.imgur.com/GHYs3fW.png) 

---

## 🎯 Project Purpose

In the world of cybersecurity, staying ahead of threats is critical. Security Operations Center (SOC) analysts are often inundated with data from dozens of disconnected sources. The goal of this project was to build a simple, efficient, and automated tool to:

1.  **Aggregate Intelligence:** Automatically pull fresh threat data (Indicators of Compromise - IOCs) from multiple trusted APIs.
2.  **Normalize & Process:** Clean, shuffle, and enrich the raw data by geolocating IPs and resolving domains to make it actionable.
3.  **Visualize Data:** Present the intelligence in an intuitive, easy-to-understand web interface, featuring an interactive map and a detailed, paginated table.
4.  **Automate Everything:** Use a CI/CD pipeline (GitHub Actions) to create a self-updating, 24/7 dashboard that requires zero manual intervention.

---

## ✨ Features

* **Live Data Feeds:** Ingests real-time threat data from:
    * AlienVault OTX
    * Feodo Tracker (abuse.ch)
    * OpenPhish
* **Automated Updates:** A GitHub Actions workflow runs every 30 minutes, automatically fetching new data and deploying it to the live site.
* **Interactive Global Threat Map:**
    * Visualizes geolocated threats (IPs, Domains, URLs).
    * Uses **Marker Clustering** to handle large numbers of points gracefully.
    * Features color-coded markers for different indicator types (**Red:** IPv4, **Blue:** Domain, **Yellow:** URL).
    * Includes a "Home" button to easily reset the map view.
* **Detailed Indicator Table:**
    * Displays all collected IOCs in a clean, paginated table.
    * Color-coded indicator types for quick identification.
* **Interactive Linking:** The map and table are linked. Clicking a geolocated indicator in the table flies the map to its location, and clicking a marker on the map highlights its row in the table.
* **Live Status & Auto-Refresh:**
    * Displays the next scheduled update time.
    * Automatically refreshes the data in the browser tab when a new update is available.
* **Professional UI:**
    * A modern, responsive "glassmorphism" interface.
    * Includes a **Light/Dark Mode** toggle that remembers the user's preference.

---

## 🛠️ Tech Stack

* **Backend:** Python
* **Frontend:** HTML5, CSS3, JavaScript
* **Key Libraries:**
    * `requests` & `python-dotenv` (Python)
    * Leaflet.js & Leaflet.markercluster (Interactive Map)
    * Tailwind CSS (Styling)
* **Automation & Deployment:**
    * GitHub Actions (CI/CD for data fetching)
    * GitHub Pages (Static site hosting)

---

## ⚙️ How It Works

The project operates as a simple but powerful data pipeline:

1.  **Scheduled Trigger:** The GitHub Actions workflow kicks off on a 30-minute schedule.
2.  **Data Fetching:** A virtual machine runs the `backend/fetch_threats.py` script. It calls the various APIs and gathers thousands of indicators.
3.  **Processing & Enrichment:** The script shuffles the data for diversity, resolves domains/URLs to IPs, geolocates them, and trims the list to a manageable size.
4.  **Data Commit:** The processed data is saved as a single `docs/data.json` file. The GitHub Action then commits this updated file directly back to the repository.
5.  **Deployment:** Because the repository's `docs` folder is configured as the source for GitHub Pages, this new commit automatically triggers a redeployment of the live website with the fresh data.

---

## 🚀 Setup and Deployment

### Local Setup

To run this project locally:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Sanilpanchal23/CTI-DASHBOARD.git](https://github.com/Sanilpanchal23/CTI-DASHBOARD.git)
    cd CTI-DASHBOARD
    ```

2.  **Set up the Backend:**
    * Navigate to the backend folder: `cd backend`
    * Create a Python virtual environment: `python -m venv venv`
    * Activate it:
        * Windows: `.\venv\Scripts\activate`
        * macOS/Linux: `source venv/bin/activate`
    * Install dependencies: `pip install -r requirements.txt`
    * Create a `.env` file in the `backend` folder and add your AlienVault OTX API key:
        ```
        OTX_API_KEY="YOUR_API_KEY_HERE"
        ```

3.  **Run Locally:**
    * Generate the data file by running the script from the `backend` directory: `python fetch_threats.py`
    * Open the `docs/index.html` file in your browser, preferably using a live server extension in your code editor.

### Deployment

1.  **Push to GitHub:** Upload the entire project to a new GitHub repository.
2.  **Add Repository Secret:** In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`. Create a new secret named `OTX_API_KEY` and paste your API key as the value.
3.  **Configure GitHub Pages:** Go to `Settings` > `Pages`. Set the **Source** to `Deploy from a branch` and choose the `main` branch with the `/docs` folder.
4.  **Enable Workflow:** The `.github/workflows/update_threat_data.yml` file will automatically be detected, running the script on schedule and keeping your dashboard live.

### Creating `requirements.txt`
If this file doesn't exist in the `backend` folder, create it with the following content:
