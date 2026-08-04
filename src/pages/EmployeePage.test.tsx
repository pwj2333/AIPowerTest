import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { assessmentRepository } from "../domain/store";

describe("employee adaptive assessment flow", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assessmentRepository.reset();
  });

  it("passes one three-question stage, stops at the next failure, and shows the result", async () => {
    const user = userEvent.setup();
    const campaign = assessmentRepository.createCampaign({ name: "测试批次" });
    const [participant] = assessmentRepository.importParticipants(campaign.id, [
      { name: "测试员工", department: "运营部", position: "专员" }
    ]).imported;
    sessionStorage.setItem(`assessment-identity:${participant.token}`, "verified");

    render(<MemoryRouter initialEntries={[`/assessment/${participant.token}`]}><App /></MemoryRouter>);

    expect(screen.getByText("姓名核验成功")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始 L1 测评" }));
    expect(screen.getByRole("navigation", { name: "本关题目轨迹" })).toBeInTheDocument();

    const firstQuestionOrder = screen.getAllByRole("radio").map((option) => option.getAttribute("data-testid"));
    fireEvent.click(screen.getByTestId("option-3"));
    fireEvent.click(screen.getByRole("button", { name: "下一题" }));
    fireEvent.click(screen.getByRole("button", { name: "上一题" }));
    expect(screen.getAllByRole("radio").map((option) => option.getAttribute("data-testid"))).toEqual(firstQuestionOrder);

    for (let questionNumber = 1; questionNumber <= 3; questionNumber += 1) {
      fireEvent.click(screen.getByTestId("option-3"));
      if (questionNumber < 3) fireEvent.click(screen.getByRole("button", { name: "下一题" }));
    }
    await user.click(screen.getByRole("button", { name: "提交本关" }));
    expect(screen.getByText("L1 已通过")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "进入 L2" }));

    for (let questionNumber = 1; questionNumber <= 3; questionNumber += 1) {
      fireEvent.click(screen.getByTestId("option-0"));
      if (questionNumber < 3) fireEvent.click(screen.getByRole("button", { name: "下一题" }));
    }
    await user.click(screen.getByRole("button", { name: "结束测评" }));

    expect(await screen.findByText(/实际答题 6 题/)).toBeInTheDocument();
    expect(screen.getByText(/最高通过 L1/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "逐关结果" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
