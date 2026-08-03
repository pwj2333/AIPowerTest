import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    fireEvent.change(editor, { target: { value: (editor as HTMLTextAreaElement).value.replace("你要写会议通知", "你要写正式会议通知") } });
    fireEvent.click(screen.getByRole("button", { name: "保存新版本" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已保存 v2.2");
    expect(assessmentRepository.getQuestionBank().questions[0].prompt).toContain("正式会议通知");
  });

  it("copies people between campaigns and exposes a roster export", async () => {
    const source = assessmentRepository.createCampaign({ name: "Source" });
    const target = assessmentRepository.createCampaign({ name: "Target" });
    assessmentRepository.importParticipants(source.id, [{ name: "Alice", department: "Sales", position: "Lead" }]);
    assessmentRepository.importParticipants(target.id, [{ name: "Alice", department: "Sales", position: "Old" }]);
    render(
      <MemoryRouter initialEntries={["/admin/people"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("目标测评批次"), { target: { value: source.id } });
    expect(screen.getByRole("button", { name: "导出人员 CSV" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("复制到批次"), { target: { value: target.id } });
    fireEvent.click(screen.getByRole("button", { name: "复制人员" }));

    expect(await screen.findByRole("status")).toHaveTextContent("复制 0 人，跳过 1 人");
  });

  it("archives, recovers, and permanently deletes campaigns with confirmation", async () => {
    const campaign = assessmentRepository.createCampaign({ name: "Lifecycle" });
    render(
      <MemoryRouter initialEntries={["/admin/campaigns"]}>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle("归档批次"));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Lifecycle" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "显示已归档" }));
    expect(screen.getByRole("heading", { name: "Lifecycle" })).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("恢复批次"));
    await waitFor(() => expect(screen.getByText("进行中")).toBeInTheDocument());

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTitle("永久删除批次"));
    expect(await screen.findByText("还没有测评批次")).toBeInTheDocument();
    expect(assessmentRepository.getCampaign(campaign.id)).toBeUndefined();
  });
});
