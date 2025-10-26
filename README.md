# CapitaLiteracy

CapitaLiteracy is a full-stack financial literacy application designed to help users understand and manage their spending. Users can upload their credit and debit bank statements as images or PDFs. The application utilizes Optical Character Recognition (OCR) to extract transaction data, which is then automatically categorized and visualized on an interactive dashboard. The platform also features a personalized goal-setting module and an AI-powered chatbot to provide financial insights and advice.

## ✨ Features

*   **Secure User Authentication**: Manages user sign-up and login via Supabase.
*   **Bank Statement Upload**: Supports uploading credit and debit statements in PDF, PNG, and JPG formats.
*   **OCR Transaction Extraction**: Automatically extracts transaction details from uploaded documents using Tesseract.
*   **Automatic Spending Categorization**: Sorts transactions into categories like Shopping, Bills, Travel, and more.
*   **Interactive Data Visualization**: Displays spending data through dynamic pie charts and line charts showing daily spending trends.
*   **Personalized Budget Goals**: Allows users to interactively set and save their monthly spending goals by category.
*   **AI Financial Coach**: A Gemini-powered chatbot provides personalized financial advice and answers questions about user spending data.

## 💻 Technology Stack

*   **Frontend**: React, Vite, Material-UI (MUI), React Router, ApexCharts
*   **Backend (API & Processing)**: Python, Flask, Google Gemini
*   **OCR**: Tesseract, Pillow, pdf2image
*   **Database & Authentication**: Supabase

## 🚀 Getting Started

Follow these instructions to get a local copy of the project up and running.

### Prerequisites

*   **Node.js and npm**: Required for the frontend. (https://nodejs.org/)
*   **Python**: Version 3.8 or higher. (https://www.python.org/)
*   **Tesseract OCR Engine**: This is a system dependency that must be installed separately from the Python packages.
    *   Follow the installation instructions for your OS at the [official Tesseract documentation](https://tesseract-ocr.github.io/tessdoc/Installation.html).
    *   Ensure the Tesseract executable is in your system's PATH.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/ao561/capitaliteracy_whack2025.git
    cd capitaliteracy_whack2025
    ```

2.  **Set up Environment Variables:**

    Create a `.env` file in the root directory and add your API keys. You can use the `.env.example` file as a template.
    ```
    VITE_SUPABASE_URL="your_supabase_project_url"
    VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
    GEMINI_API_KEY="your_google_gemini_api_key"
    ```

3.  **Install Frontend Dependencies:**
    ```sh
    npm install
    ```

4.  **Install Backend Dependencies:**

    It is recommended to use a virtual environment for the Python packages.
    ```sh
    # Create and activate a virtual environment
    python -m venv venv
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate

    # Install Python packages from both requirements files
    pip install -r requirements.txt
    pip install -r src/backend/requirements.txt
    ```

## ⚙️ Running the Application

You need to run two separate processes: the Python backend and the React frontend.

1.  **Start the Python Backend Server:**

    This server handles file processing, OCR, and the chatbot API. It runs on port 3001.
    ```sh
    python src/backend/characterRecognition/app.py
    ```

2.  **Start the React Frontend Server:**

    This will start the Vite development server, typically on port 5173.
    ```sh
    npm run dev
    ```

3.  **Access the Application:**
    Open your web browser and navigate to the local address provided by the Vite server (e.g., `http://localhost:5173`).

## 🛠️ How It Works

1.  **Authentication**: A new user signs up by providing their details, or an existing user logs in. User data and financial goals are managed via Supabase.
2.  **File Upload**: The user uploads their financial statements (credit or debit) in PDF, PNG, or JPG format.
3.  **Processing**: The user clicks "Continue," which sends a request to the Flask backend to start processing the uploaded files. The frontend shows a loading screen while streaming status updates from the backend.
4.  **OCR and Data Extraction**: The backend uses Tesseract to perform OCR on the documents, extracting raw text.
5.  **Parsing and Categorization**: The extracted text is parsed to identify individual transactions, which are then categorized based on merchant names.
6.  **Dashboard Visualization**: Once processing is complete, the user is redirected to the main dashboard where their categorized spending is displayed in interactive charts.
7.  **Goal Setting**: The user can navigate to the "Goals" tab to set a target budget mix, which is saved to their profile.
8.  **AI Chat**: The user can interact with the Gemini-powered chatbot to ask questions about their spending patterns and receive financial advice.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
