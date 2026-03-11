import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./modern/App";
import "../assets/styles/style.css";

function loadOptionalConfigScript() {
	return new Promise((resolve) => {
		window.LECTURE_ASSISTANT_LOCAL_CONFIG = window.LECTURE_ASSISTANT_LOCAL_CONFIG || {};

		const script = document.createElement("script");
		script.src = "/config/local-config.js";
		script.async = false;
		script.onload = () => resolve();
		script.onerror = () => resolve();
		document.head.appendChild(script);
	});
}

loadOptionalConfigScript().finally(() => {
	createRoot(document.getElementById("root")).render(<App />);
});
