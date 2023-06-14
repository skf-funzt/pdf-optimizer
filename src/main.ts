import { join } from "https://deno.land/std@0.191.0/path/mod.ts";
import { ExpectedException } from "https://deno.land/x/allo_arguments@v6.0.6/mod.ts";
import { readAll, readLines, writeAll } from "https://deno.land/std@0.104.0/io/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.136.0/streams/conversion.ts";
import { PromisePool } from "https://deno.land/x/promise_pool/index.ts";
import { MultiProgressBar } from "https://deno.land/x/progress@v1.3.8/mod.ts";

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
  // Set aborted to true
  Deno.exit(1);
});

// Create a counter for successful conversions
let successCount = 0;
// Create a counter for failed conversions
let failCount = 0;
//Create a counter for skipped files
let skipCount = 0;

const bars = new MultiProgressBar({
  title: 'Optimizing PDFs',
  // clear: true,
  complete: "=",
  incomplete: "-",
  display: "[:bar] :text :percent :time :completed/:total",
});

// Create a type ProgressBarRenderOptions
type ProgressBarRenderOption = Parameters<typeof bars.render>[0][0] | { completed: number, total: number }
// Declare an array of PRogressBarRenderOptions
const mapBarComponents = new Map<string, ProgressBarRenderOption>();

// Create a total count of files
let totalCount = 1;
// Create an overall progress bar
const overallBar: () => ProgressBarRenderOption = () => ({
  completed: successCount + failCount + skipCount,
  total: totalCount,
  text: 'Overall Progress',
})


// Create a new Promise Pool
const pool = new PromisePool({ concurrency: args.parallel ?? 1 });
const promises: Array<Promise<void>> = [];

// Read all files in the directory
for await (const dirEntry of Deno.readDir(args.directory)) {
  // Increase the total count
  const index = totalCount;
  totalCount++;
  // Create a promise for each file
  const promise = async () => {
    if (args.verbose) console.log(`Converting ${dirEntry.name}`);
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
    // Spawn a subprocess and collect output
    // Wait for the subprocess to finish
    const { status, stderr, stdout } = command.spawn();

    // pipe the stdout and stderr to the console
    // pipeThrough(dirEntry.name, readerFromStreamReader(stdout.getReader()), Deno.stdout);
    // pipeThrough(dirEntry.name + " Error", readerFromStreamReader(stderr.getReader()), Deno.stderr);

    // Encode the stderr into a string asynchronously
    const stderrString = readAll(readerFromStreamReader(stderr.getReader()));

    const pipeToProgressBar = async (
      prefix: string,
      reader: Deno.Reader,
    ) => {
      let totalPages: number | undefined = undefined;
      let currentPage = 0;
      const progressBarRenderOption: ProgressBarRenderOption = {
        completed: currentPage,
        total: totalPages,
        text: prefix,
      };
      // Add the bar component to the map
      mapBarComponents.set(prefix, progressBarRenderOption);
      // Create a text encoder
      const encoder = new TextEncoder();
      for await (const line of readLines(reader)) {
        // If verbose is true, print the line with the prefix
        if (args.verbose) console.log(`[${prefix}] ${line}`);

        // Search the line for the progress percentage
        // Get the total pages by using a regex with named groups
        // Example output is `Processing pages 1 through 132`
        const totalPagesMatch = line.match(/Processing pages (?<start>\d+) through (?<end>\d+)/)?.groups?.end;
        totalPages = totalPagesMatch ? parseInt(totalPagesMatch) : totalPages;
        // If verbose is true, log the total pages
        if (args.verbose) console.log(`[${prefix}] Total pages: ${totalPages}`);
        // Get the current page by using a regex with named groups
        // Example output is `Page 1`
        const currentPageMatch = line.match(/Page (?<page>\d+)/)?.groups?.page;
        currentPage = currentPageMatch ? parseInt(currentPageMatch) : currentPage;
        // If verbose is true, log the current page
        if (args.verbose) console.log(`[${prefix}] Current page: ${currentPage}`);

        // Send the information to the progress bar
        // Render bars only if total pages is defined
        if (totalPages) {
          // If verbose is true, log the progress bar render option update
          if (args.verbose) console.log(`[${prefix}] Updating progress bar render option`);
          // Update the progressBarRenderOption in the map
          mapBarComponents.set(prefix, {
            ...progressBarRenderOption,
            completed: currentPage,
            total: totalPages,
          });
        }
      }
    }

    // pipe the stdout and stderr to the progress bar
    pipeToProgressBar(`${index} ${dirEntry.name}`, readerFromStreamReader(stdout.getReader()));

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
      console.log(`Failed to convert ${dirEntry.name} with error:\n\tcode: ${statusSync.code}\n\tsuignal: ${statusSync.signal}\n\tsuccess: ${statusSync.success}\n\tstderr: ${stderrString}`);
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

let allPromisesDone = false;
Promise.all(promises).then(() => allPromisesDone = true);

// While awaiting allPRomises, we render the bars
while (!allPromisesDone && !abortController.signal.aborted) {
  // Render the bars by converting the map intp an array
  const barComponents = [
    overallBar(),
    ...Array.from(mapBarComponents.values())
    // Remove finished processes
    .filter((it) => it.completed !== it.total)
  ];
  // Render the bars
  bars.render(barComponents);
  // Delay rerendering the bars by awaiting a timeout for 100ms
  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Print the result of the conversion by using the patterns successCount, failCount and skipCount
console.log(`Converted ${successCount} files, skipped ${skipCount} files and failed to convert ${failCount} files.`);
