import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { assessmentRepository } from "../domain/store";

describe("administrator workspace", () => {
  beforeEach(() => {
    localStorage.clear();
    assessmentRepository.reset();
  });

  it("shows campaign diagnostics and supports roster import", () => {
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
    fireEvent.change(screen.getByLabelText("CSV 名单"), { target: { value: "姓名,部门,岗位\n测试员工,运营部,专员" } });
    fireEvent.click(screen.getByRole("button", { name: "导入名单" }));
    expect(screen.getByText("成功导入 1 人")).toBeInTheDocument();
  });
});
