import "dotenv/config";
import { expect, test } from "@jest/globals";
import { envVariablesValid } from "../api/utils";

test("env variables are valid", () => {
  expect(envVariablesValid()).toEqual(true);
});
