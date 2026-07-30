import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { assessmentRepository } from "../domain/store";

describe("administrator workspace", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assessmentRepository.reset();
  });

  it("shows campaign diagnostics and supports roster import", async () => {
    assessmentRepository.createCampaign({ name: "正式测评" });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("参测率")).toBeInTheDocument();
    expect(screen.getByText("部门平均等级")).toBeInTheDocument();
    expect(screen.getByText("优先补强能力")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "人员名单" }));
    expect(screen.getByRole("heading", { name: "人员名单" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("CSV 人员数据"), { target: { value: "姓名,部门,岗位\n测试员工,运营部,专员" } });
    fireEvent.click(screen.getByRole("button", { name: "导入人员" }));
    expect(await screen.findByText("成功导入 1 人")).toBeInTheDocument();
  });

  it("validates and saves Markdown question edits", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/question-bank"]}>
        <App />
      </MemoryRouter>,
    );

    const editor = screen.getByLabelText("Markdown 题库内容");
    fireEvent.change(editor, { target: { value: (editor as HTMLTextAreaElement).value.replace("你要用 AI 起草一封会议通知", "你要用 AI 起草一封正式会议通知") } });
    fireEvent.click(screen.getByRole("button", { name: "保存新版本" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已保存 v2.1");
    expect(assessmentRepository.getQuestionBank().questions[0].prompt).toContain("正式会议通知");
  });
});
