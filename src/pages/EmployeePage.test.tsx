import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { assessmentRepository } from "../domain/store";

describe("employee assessment flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assessmentRepository.reset();
  });

  it("completes all questions and shows the level and action plan", async () => {
    const campaign = assessmentRepository.createCampaign({ name: "测试批次" });
    assessmentRepository.importParticipants(campaign.id, [
      { name: "测试员工", department: "运营部", position: "专员" }
    ]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "开始答题" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "其他员工" } });
    fireEvent.click(screen.getByRole("button", { name: "进入测评" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("未找到该姓名，请联系管理员");

    fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "测试员工" } });
    fireEvent.click(screen.getByRole("button", { name: "进入测评" }));
    expect(await screen.findByText("姓名核验成功")).toBeInTheDocument();
    expect(screen.getByText("运营部")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始答题" }));
    expect(screen.getByRole("navigation", { name: "题目轨迹" })).toBeInTheDocument();

    for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
      fireEvent.click(screen.getByTestId("option-3"));
      if (questionNumber < 20) {
        fireEvent.click(screen.getByRole("button", { name: "下一题" }));
      } else {
        fireEvent.click(screen.getByRole("button", { name: "提交测评" }));
      }
    }

    expect((await screen.findAllByText("荣耀王者级")).length).toBeGreaterThan(0);
    expect(screen.getByText(/行动任务/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
