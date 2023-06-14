import { Arguments } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { credits } from "./gs-cmd.ts";

export function getArguments() {
  const args = new Arguments({
    ...Arguments.createHelpOptions(),
    'directory': {
      shortName: 'd',
      description: 'The directory path to convert all PDF files.',
      convertor: Arguments.stringConvertor,
    },
    'outDirectory': {
      shortName: 'o',
      description: 'The output directory path to save all the compressed PDF files in.',
      convertor: Arguments.stringConvertor,
    },
    'parallel': {
      shortName: 'p',
      description: 'The number of parallel processes to run.',
      convertor: Arguments.numberConvertor,
    },
    'verbose': {
      shortName: 'v',
      description: 'The output directory path to save all the compressed PDF files in.',
      convertor: Arguments.booleanConvertor,
    },
  })
    .setDescription(`
      This is a sample program to optimize PDF files.\n
      \n
      Actually used to learn a bit Deno.\n
      The ghostscript command used was provided by:\n
      Name: ${credits.author}\n
      Profile: ${credits.profile}\n
      Source: ${credits.source}\n
      \n
      Big thanks ❤️\n
    `);


  // Important for `--help` flag works.
  if(args.isHelpRequested())
    args.triggerHelp();

  return args.getFlags();
}
