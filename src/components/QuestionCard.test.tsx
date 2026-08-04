import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuestionCard from "./QuestionCard";
import { questions } from "../domain/questions";

function readScoreOrder(seed: string): string[] {
  const view = render(<QuestionCard question={questions[0]} seed={seed} onSelect={() => undefined} />);
  const order = screen.getAllByRole("radio").map((option) => option.getAttribute("data-testid") ?? "");
  view.unmount();
  return order;
}

describe("QuestionCard option order", () => {
  it("keeps one participant's order stable while varying it for other participants", () => {
    const first = readScoreOrder("participant-a");
    expect(readScoreOrder("participant-a")).toEqual(first);
    expect(readScoreOrder("participant-b")).not.toEqual(first);
  });

  it("allows every score to appear in every visible position", () => {
    const orders = Array.from({ length: 80 }, (_, index) => readScoreOrder(`participant-${index}`));
    const positionsForHighest = new Set(orders.map((order) => order.indexOf("option-3")));

    expect(positionsForHighest).toEqual(new Set([0, 1, 2, 3]));
  });
});
