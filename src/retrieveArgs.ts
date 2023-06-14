import { Arguments, ExpectedException } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { getArguments } from "./getArguments.ts";

export type ArgumentsType = ReturnType<typeof getArguments>;

export let readArgs: ArgumentsType | undefined;

export function retrieveArgs() {
  if(readArgs === undefined) {
    throw new ExpectedException('Arguments are undefined');
  }
  const args: ArgumentsType = readArgs;
  // Log the file path
  console.log('File path: ', args.directory);
  return args;
}

try {
  readArgs = getArguments();
} catch (error) {
  Arguments.rethrowUnprintableException(error);
}
