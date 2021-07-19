import * as cheerio from "cheerio";
import { BuildResult } from "esbuild";
import * as fs from "fs";
import * as path from "path";

export type IndexOptions = {
    /**
     * Path to the original HTML file that will be modified.
     */
    originalFile: string;
    
    /**
     * Path where the modified HTML file will be written to. By default this is an index.html file in the outdir or next to the outfile.
     */
    outFile?: string;
    /**
     * Prefix to prepend to all paths.
     */
    pathPrefix?: string;
    /**
     * String or regex to remove from all paths, for example to remove a base dir: /^dist\//
     * 
     * By default this is inferred from the build options' outfile or outdir.
     */
    trimPath?: string | RegExp;
    /**
     * Add <link rel="preload"> elements to the head.
     */
    preload?: { href: string; as: string }[];
}

export function generateIndexHTML(result: BuildResult, opts: IndexOptions) {
    if (!result.metafile) {
        throw new Error("The \"metafile\" option must be set to true in the build options");
    }
    if (!opts.outFile) {
        throw new Error("No outFile was specified and it could not be inferred from the build options");
    }

    const $ = cheerio.load(fs.readFileSync(opts.originalFile));

    if (opts.preload) {
        for (const item of opts.preload) {
            const link = $("<link rel='preload'>")
            link.attr("href", item.href);
            link.attr("as", item.as);
            link.insertAfter($("head :last-child"))
        }
    }

    for (let name in result.metafile.outputs) {
        if (opts.trimPath) {
            name = name.replace(opts.trimPath, "");
        }

        if (opts.pathPrefix && !name.startsWith(opts.pathPrefix)) {
            name = opts.pathPrefix + name;
        }

        const ext = path.extname(name);

        if (ext === ".js") {
            const script = $("<script>");
            script.attr("src", name);
            script.insertAfter($("body :last-child"));
        } else if (ext === ".css") {
            const link = $("<link rel='stylesheet'>")
            link.attr("href", name);
            link.insertAfter($("head :last-child"))
        }
    }

    fs.writeFileSync(opts.outFile, $.html());
}
