import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { BookingProvider } from "./context/BookingContext"; // ✅ ADD THIS
import "./index.css";
import "./i18n";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <BookingProvider> {/* ✅ WRAP HERE */}
      <App />
    </BookingProvider>
  </BrowserRouter>
);