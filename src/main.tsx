import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { assessmentRepository } from "./domain/store";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);

assessmentRepository.initialize().then(() => root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)).catch((error) => root.render(
  <main className="startup-error" role="alert">
    <h1>系统暂时无法启动</h1>
    <p>{error instanceof Error ? error.message : "无法读取服务器数据，请稍后重试。"}</p>
    <button className="button button-primary" type="button" onClick={() => window.location.reload()}>重新加载</button>
  </main>,
));
