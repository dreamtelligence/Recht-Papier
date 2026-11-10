import { Ajv } from "npm:ajv@8.17.1";
import schema from "../../../packages/shared/contract.schema.json" with { type: "json" };
import type { Input, Result } from "../../../packages/shared/contract.ts";

const ajv = new Ajv({ allErrors: true });
const input = ajv.compile({ ...schema, $ref: "#/definitions/Input" });
const result = ajv.compile({ ...schema, $ref: "#/definitions/Result" });

export function validateInput(value: unknown): asserts value is Input {
  if (!input(value)) {
    throw new Error("Die strukturierten Angaben sind unvollständig oder ungültig.");
  }
}

export function validateResult(value: unknown): asserts value is Result {
  if (!result(value)) throw new Error("Das Ergebnis entspricht nicht dem Schnittstellenvertrag.");
}
