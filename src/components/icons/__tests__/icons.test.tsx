import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  IconFiles,
  IconSettings,
  IconRefresh,
  IconExpand,
  ExpandIcon,
  IconWarning,
  IconPencil,
  CollapseIcon,
  ResetViewIcon,
  ClearActiveIcon,
  GridIcon,
  IconBug,
} from "../index";

const icons = [
  ["IconFiles", IconFiles],
  ["IconSettings", IconSettings],
  ["IconRefresh", IconRefresh],
  ["IconExpand", IconExpand],
  ["IconWarning", IconWarning],
  ["IconPencil", IconPencil],
  ["CollapseIcon", CollapseIcon],
  ["ResetViewIcon", ResetViewIcon],
  ["ClearActiveIcon", ClearActiveIcon],
  ["GridIcon", GridIcon],
  ["IconBug", IconBug],
] as const;

describe("icons", () => {
  it.each(icons)("%s는 SVG 엘리먼트를 렌더링한다", (_name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it.each(icons)("%s는 스냅샷과 일치한다", (_name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ExpandIcon은 IconExpand와 동일한 컴포넌트이다", () => {
    expect(ExpandIcon).toBe(IconExpand);
  });

  it("GridIcon은 className prop을 받아 적용한다", () => {
    const { container } = render(<GridIcon className="text-red-500" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-red-500");
  });

  it("GridIcon은 className 미지정 시 기본값을 사용한다", () => {
    const { container } = render(<GridIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-[#30363d]");
  });
});
