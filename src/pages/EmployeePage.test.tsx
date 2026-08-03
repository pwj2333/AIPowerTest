import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();
    const campaign = assessmentRepository.createCampaign({ name: "测试批次" });
    const [participant] = assessmentRepository.importParticipants(campaign.id, [
      { name: "测试员工", department: "运营部", position: "专员" }
    ]).imported;
    sessionStorage.setItem(`assessment-identity:${participant.token}`, "verified");

    render(
      <MemoryRouter initialEntries={[`/assessment/${participant.token}`]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("姓名核验成功")).toBeInTheDocument();
    expect(screen.getByText("运营部")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始答题" }));
    expect(screen.getByRole("navigation", { name: "题目轨迹" })).toBeInTheDocument();

    const firstQuestionOrder = screen.getAllByRole("radio").map((option) => option.getAttribute("data-testid"));
    fireEvent.click(screen.getByTestId("option-3"));
    fireEvent.click(screen.getByRole("button", { name: "下一题" }));
    fireEvent.click(screen.getByRole("button", { name: "上一题" }));
    expect(screen.getAllByRole("radio").map((option) => option.getAttribute("data-testid"))).toEqual(firstQuestionOrder);

    for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
      fireEvent.click(screen.getByTestId("option-3"));
      if (questionNumber < 20) {
        fireEvent.click(screen.getByRole("button", { name: "下一题" }));
      } else {
        await user.click(screen.getByRole("button", { name: "提交测评" }));
      }
    }

    expect((await screen.findAllByText("荣耀王者级")).length).toBeGreaterThan(0);
    expect(screen.getByText(/行动任务/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
