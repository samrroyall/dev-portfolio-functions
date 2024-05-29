import "dotenv/config";
import { describe, expect, test } from "@jest/globals";
import { envVariablesValid } from "../api/utils";

describe("utils tests", () => {
  test("env variables are valid", () => {
    expect(envVariablesValid()).toEqual(true);
  });
});
