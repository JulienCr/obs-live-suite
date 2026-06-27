/** @jest-environment jsdom */
import React from "react";
import { render } from "@testing-library/react";
import { PosterDisplay } from "@/components/overlays/PosterDisplay";

const YOUTUBE_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

function getYouTubeWrapper(container: HTMLElement): HTMLElement {
  const iframe = container.querySelector('iframe[title="YouTube video"]');
  expect(iframe).not.toBeNull();
  return iframe!.parentElement as HTMLElement;
}

describe("PosterDisplay YouTube orientation", () => {
  it("renders a vertical 9:16 box for portrait Shorts in center mode", () => {
    const { container } = render(
      <PosterDisplay
        fileUrl={YOUTUBE_URL}
        type="youtube"
        aspectRatio={16 / 9}
        positioning="center"
        orientation="portrait"
      />
    );

    const wrapper = getYouTubeWrapper(container);
    expect(wrapper.style.aspectRatio).toBe("9 / 16");
    // Portrait is height-driven; width must not be pinned to the full viewport.
    expect(wrapper.style.width).not.toBe("100vw");
    expect(wrapper.style.height).toBe("100vh");
  });

  it("renders a 16:9 box for landscape YouTube in center mode", () => {
    const { container } = render(
      <PosterDisplay
        fileUrl={YOUTUBE_URL}
        type="youtube"
        aspectRatio={16 / 9}
        positioning="center"
        orientation="landscape"
      />
    );

    const wrapper = getYouTubeWrapper(container);
    expect(wrapper.style.aspectRatio).toBe("16 / 9");
    expect(wrapper.style.width).toBe("100vw");
  });

  it("defaults to 16:9 landscape when no orientation is given", () => {
    const { container } = render(
      <PosterDisplay
        fileUrl={YOUTUBE_URL}
        type="youtube"
        aspectRatio={16 / 9}
        positioning="center"
      />
    );

    const wrapper = getYouTubeWrapper(container);
    expect(wrapper.style.aspectRatio).toBe("16 / 9");
  });

  it("renders a vertical 9:16 box for portrait Shorts in side mode", () => {
    const { container } = render(
      <PosterDisplay
        fileUrl={YOUTUBE_URL}
        type="youtube"
        aspectRatio={16 / 9}
        positioning="side"
        side="left"
        orientation="portrait"
      />
    );

    const wrapper = getYouTubeWrapper(container);
    expect(wrapper.style.aspectRatio).toBe("9 / 16");
    // Portrait side mode is height-driven, not the 50% width used for landscape.
    expect(wrapper.style.width).not.toBe("50%");
  });
});
