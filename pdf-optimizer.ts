import { join } from "https://deno.land/std@0.191.0/path/mod.ts";
import { Arguments, ExpectedException } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { exec } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { gsCmd, credits } from "./gs-cmd.ts"

function getArguments() {
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
    `)


  // Important for `--help` flag works.
  if (args.isHelpRequested()) args.triggerHelp();

  return args.getFlags();
}

try {
  const args = getArguments();
  // Log the file path
  console.log('File path: ', args.directory);
  // const files = await exec(`ls -l ${args.filePath}`);
  // console.log('Exec status: ', files.status);
  // console.log('Files found: ', files.output);

  // If args.directory is undefined, throw an error
  if (args.directory === undefined) {
    throw new ExpectedException('File path is undefined');
  }
  // If args.outDirectory is undefined, throw an error
  if (args.outDirectory === undefined) {
    throw new ExpectedException('Output directory is undefined');
  }

  // Check if the output directory exists, if not create it
  // Using a try block in case the directory does not exist
  // Use a catch block to ctach the NotFound exception and create the directory
  try {
    await Deno.stat(args.outDirectory);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(args.outDirectory);
    }
  }
  // Register a signal listener for SIGINT to remove the output directory
  // This is to prevent the output directory from being left behind if the program is terminated
  Deno.addSignalListener("SIGINT", () => {
    // Log the termination reason
    console.log('\nTerminated by SIGINT');
    // Log a message to console
    console.log(`Removing output directory ${args.outDirectory}`);
    Deno.remove(args.outDirectory!, { recursive: true });
    // Exit the program
    // Log a message to console
    console.log('Exiting program');
    Deno.exit(1);
  });

  // Create a counter for successful conversions
  let successCount = 0;
  // Create a counter for failed conversions
  let failCount = 0;
  //Create a counter for skipped files
  let skipCount = 0;

  // Read all files in the directory
  for await (const dirEntry of Deno.readDir(args.directory)) {
    console.log(`Converting ${dirEntry.name}`);
    // Check if the file is not a PDF file, log a message to console and continue
    if (!dirEntry.name.endsWith('.pdf')) {
      // Log a message to console if verbose is true
      if (args.verbose) console.log(`Skipping ${dirEntry.name}`);
      skipCount++;
      continue;
    }
    // Use the gsCmd constant to execute the Ghostscript command
    // First repalce the {{input}} and {{output}} placeholders with the file name
    const cmd = gsCmd.replace('{{input}}', join(args.directory, dirEntry.name)).replace('{{output}}', join(args.outDirectory, dirEntry.name));
    // Log the command if verbose is true
    if (args.verbose) console.log(`Command to convert the PDF: ${cmd}`);
    // Execute the command
    const result = await exec(cmd);
    // Log the result if verbose is true
    if (args.verbose) console.log(`Result: ${result.status} - ${result.output}`);
    // Check if the command was successful
    if (result.status.success) {
      successCount++;
    } else {
      // Delete the output file
      try {
        await Deno.remove(join(args.outDirectory, dirEntry.name));
      }
      catch {
        // Do nothing
      }
      finally {
        failCount++;
      }
    }
  }

  // Print the result of the conversion by using the patterns successCount, failCount and skipCount
  console.log(`Converted ${successCount} files, skipped ${skipCount} files and failed to convert ${failCount} files.`);
} catch (error) {
  Arguments.rethrowUnprintableException(error);
}
