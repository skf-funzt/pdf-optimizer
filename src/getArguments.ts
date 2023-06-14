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
    'verbose': {
      shortName: 'v',
      description: 'The output directory path to save all the compressed PDF files in.',
      convertor: Arguments.booleanConvertor,
    },
    // 'myNumber': {
    //     shortName: 'n',
    //     description: 'This is a number flag.',
    //     convertor: Arguments.numberConvertor,
    //     default: () => 0
    // },
    // 'myBoolean': {
    //     shortName: 'b',
    //     description: 'This is a boolean flag.',
    //     convertor: Arguments.booleanConvertor,
    // },
    // 'myCustom': {
    //     shortName: 'c',
    //     description: 'This is a custom flag.',
    //     convertor: value => {
    //         if (value === undefined) return undefined;
    //         return `🐰 — ${value} — 🐭`;
    //     },
    // },
    // 'myDeprecated': {
    //     convertor: Arguments.stringConvertor,
    //     excludeFromHelp: true
    // },
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
