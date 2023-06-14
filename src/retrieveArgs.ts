import { Arguments, ExpectedException } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { getArguments } from "./getArguments.ts";

export type ArgumentsType = ReturnType<typeof getArguments>;

export let args: ArgumentsType | undefined;

export function retrieveArgs() {
  if(args === undefined) {
    throw new ExpectedException('Arguments are undefined');
  }
  return args as ArgumentsType;
}

try {
  args = getArguments();
} catch (error) {
  Arguments.rethrowUnprintableException(error);
}
