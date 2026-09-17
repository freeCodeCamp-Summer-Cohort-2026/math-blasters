import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { App } from "../src/App";

describe("App (setup check)", () => {
  it("renders the problem fetched from the API", async () => {

    render(<App />);
  });
});
