import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { assessmentRepository } from "../domain/store";

describe("employee assessment flow", () => {
  beforeEach(() => {
    localStorage.clear();
    assessmentRepository.reset();
  });

  it("completes all questions and shows the level and action plan", () => {
    const campaign = assessmentRepository.createCampaign({ name: "测试批次" });
    const [participant] = assessmentRepository.importParticipants(campaign.id, [
      { name: "测试员工", department: "运营部", position: "专员" }
    ]).imported;

    render(
      <MemoryRouter initialEntries={[`/assessment/${participant.token}`]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "开始答题" }));
    expect(screen.getByText("第 1 / 20 题")).toBeInTheDocument();

    for (let questionNumber = 1; questionNumber <= 20; questionNumber += 1) {
      fireEvent.click(screen.getByTestId("option-3"));
      if (questionNumber < 20) {
        fireEvent.click(screen.getByRole("button", { name: "下一题" }));
      } else {
        fireEvent.click(screen.getByRole("button", { name: "提交测评" }));
      }
    }

    expect(screen.getAllByText("荣耀王者级").length).toBeGreaterThan(0);
    expect(screen.getByText(/行动任务/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
