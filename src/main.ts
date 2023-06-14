import { join } from "https://deno.land/std@0.191.0/path/mod.ts";
import { ExpectedException } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { readLines, writeAll } from "https://deno.land/std@0.104.0/io/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.136.0/streams/conversion.ts";

import { PromisePool } from "https://deno.land/x/promise_pool/index.ts";

import { gsArgs, gsExec } from "./gs-cmd.ts"
import { ArgumentsType, retrieveArgs } from "./retrieveArgs.ts";

async function pipeThrough(
  prefix: string,
  reader: Deno.Reader,
  writer: Deno.Writer,
) {
  const encoder = new TextEncoder();
  for await (const line of readLines(reader)) {
    await writeAll(writer, encoder.encode(`[${prefix}] ${line}\n`));
  }
}

// Check if the args object is undefined, if so throw an error
const args: ArgumentsType = retrieveArgs();

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
// Create an AbortController to terminate subprocesses
const abortController = new AbortController();

// Register a signal listener for SIGINT to remove the output directory
// This is to prevent the output directory from being left behind if the program is terminated
Deno.addSignalListener("SIGINT", () => {
  // Log the termination reason
  console.log('\nTerminated by SIGINT');
  // Log a message to console
  console.log(`Removing output directory ${args.outDirectory}`);
  Deno.remove(args.outDirectory!, { recursive: true });
  // Terminating all subprocesses
  abortController.abort("SIGINT");
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

// Create a new Promise Pool
const pool = new PromisePool({ concurrency: args.parallel ?? 1 });
const promises: Array<Promise<void>> = [];

// Read all files in the directory
for await (const dirEntry of Deno.readDir(args.directory)) {
  const promise = async () => {
    console.log(`Converting ${dirEntry.name}`);
    // Check if the file is not a PDF file, log a message to console and continue
    if (!dirEntry.name.endsWith('.pdf')) {
      // Log a message to console if verbose is true
      if (args.verbose) console.log(`Skipping ${dirEntry.name}`);
      skipCount++;
      return;
    }
    // Use the gsCmd constant to execute the Ghostscript command
    // First repalce the {{input}} and {{output}} placeholders with the file name
    const cmdArgs = gsArgs.replace('{{input}}', join(args.directory!, dirEntry.name)).replace('{{output}}', join(args.outDirectory!, dirEntry.name));
    // Log the command exec and args if verbose is true
    if (args.verbose) {
      // Log the exec command
      console.log(`Executing ${gsExec}${cmdArgs}`);
      // Log curren working directory
      console.log(`CWD: ${Deno.cwd()}`);
    }
    // Log te Deno.env object if verbose is true
    // if (args.verbose) console.log(Deno.env.toObject());
    // Execute the command using Deno's subprocess API
    //! Note: Unfortunately we need to use the shell to start the gs process
    //! otherwise gs will not find the pdfwriter device for any reason.
    //? Will create an issue on this, because IMHO this is a security risk
    const command = new Deno.Command(
      'sh',
      {
        args: ['-c', `${gsExec} ${cmdArgs}`],
        signal: abortController.signal,
        stdout: 'piped',
        stderr: 'piped',
        stdin: 'null',
        cwd: Deno.cwd(),
        // env: Deno.env.toObject(),
      }
    )
    // const command = new Deno.Command(
    //   Deno.execPath(),
    //   {
    //     args: [
    //       "run",
    //       "--allow-run=gs",
    //       "gsExec.ts",
    //       `-i ${join(args.directory, dirEntry.name)}`,
    //       `-o ${join(args.outDirectory, dirEntry.name)}`,
    //     ],
    //     signal: abortController.signal,
    //     stdout: 'piped',
    //     stderr: 'piped',
    //     stdin: 'null',
    //     cwd: Deno.cwd(),
    //   }
    // )
    // Spawn a subprocess and collect output
    // Wait for the subprocess to finish
    const { status, stderr, stdout } = command.spawn();

    // pipe the stdout and stderr to the console
    pipeThrough(dirEntry.name, readerFromStreamReader(stdout.getReader()), Deno.stdout);
    pipeThrough(dirEntry.name + " Error", readerFromStreamReader(stderr.getReader()), Deno.stderr);

    const statusSync = await status;
    // // Execute the command
    // const result = await exec(cmd);
    // Log the result if verbose is true
    if (args.verbose) console.log(`Result: ${statusSync.code} - ${statusSync.success}`);
    // Check if the command was successful
    if (statusSync.code === 0) {
      successCount++;
    } else {
      // Log a message to console
      console.log(`Failed to convert ${dirEntry.name} with error: ${statusSync.code}/${statusSync.signal}/${statusSync.success}`);
      // Delete the output file
      try {
        await Deno.remove(join(args.outDirectory!, dirEntry.name));
      }
      catch {
        // Do nothing
      }
      finally {
        failCount++;
      }
    }
  }
  promises.push(pool.open(promise));
}

await Promise.all(promises)

// Print the result of the conversion by using the patterns successCount, failCount and skipCount
console.log(`Converted ${successCount} files, skipped ${skipCount} files and failed to convert ${failCount} files.`);