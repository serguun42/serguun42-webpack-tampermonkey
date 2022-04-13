const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const validateOptions = require("schema-utils");
const { RawSource } = require("webpack-sources");
const userscriptMeta = require("@tkausl/userscript-meta");
const pkgUp = require("pkg-up");

const loadHeaderFile = require("./loadHeaderFile");
const createHeaderProvider = require("./createHeaderProvider");
const interpolate = require("./interpolate");
const optionsSchema = require("./schemas/options.json");

const PLUGIN_NAME = "WebpackUserscript";
/**
 * @type {WebpackUserscriptOptions}
 */
const DEFAULT_CONFIG = {
	pretty: true,
	metajs: false,
	renameExt: true,
	downloadBaseUrl: "",
	updateBaseUrl: ""
};
const fileDependencies = new Set();

module.exports = class WebpackUserscript {
	/**
	 * @typedef WebpackUserscriptOptions
	 * @property {object|string|((data: object) => object)} headers the header object
	 * @property {boolean} metajs to generate *.meta.js
	 * @property {boolean} pretty to prettify the header block
	 * @property {boolean} renameExt to rename *.js files that are not *.user.js to become *.user.js
	 * @property {string} downloadBaseUrl base URL for download URL
	 * @property {string} updateBaseUrl base URL for update URL
	 */ /**
	 * @param {WebpackUserscriptOptions|string|((data: object) => object)} [options]
	 */
	constructor(options = {}) {
		validateOptions(optionsSchema, options, PLUGIN_NAME);

		if (options.downloadBaseUrl && !options.updateBaseUrl) {
			options.updateBaseUrl = options.downloadBaseUrl;
		} else if (!options.downloadBaseUrl && options.updateBaseUrl) {
			options.downloadBaseUrl = options.updateBaseUrl;
		}

		this.options = Object.assign(
			{},
			DEFAULT_CONFIG,
			typeof options === "string"
				? {
						headers: loadHeaderFile(options, fileDependencies)
				  }
				: typeof options === "function"
				? {
						headers: options
				  }
				: typeof options.headers === "string"
				? {
						...options,
						headers: loadHeaderFile(options.headers, fileDependencies)
				  }
				: options
		);

		this.buildNo = 0;
	}

	/**
	 *
	 * @param {import("webpack").Compiler} compiler
	 */
	apply(compiler) {
		const webpack = compiler.webpack;
		const packageJsonFile = pkgUp.sync({ cwd: compiler.options.context });
		const packageJson =
			typeof packageJsonFile === "string" ? JSON.parse(fs.readFileSync(packageJsonFile, "utf8")) : {};
		const packageInfoObj = {
			name: packageJson.name || "",
			version: packageJson.version || "",
			description: packageJson.description || "",
			author: packageJson.author || "",
			homepage: packageJson.homepage || "",
			bugs:
				typeof packageJson.bugs === "string"
					? packageJson.bugs
					: typeof packageJson.bugs === "object" && typeof packageJson.bugs.url === "string"
					? packageJson.bugs.url
					: ""
		};
		const headerProvider = createHeaderProvider(packageInfoObj, this.options.headers);
		fileDependencies.add(packageJsonFile);

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
				},
				() => {
					for (const chunk of compilation.chunks) {
						if (!chunk.canBeInitial()) {
							// non-entry
							continue;
						}

						for (const file of chunk.files) {
							const hash = compilation.hash;
							const querySplit = file.indexOf("?");
							const query = querySplit >= 0 ? file.substr(querySplit) : "";

							const filename = querySplit >= 0 ? file.substr(0, querySplit) : file;
							if (path.extname(filename) !== ".js") {
								continue;
							}

							const basename = filename.endsWith(".user.js")
								? path.basename(filename, ".user.js")
								: filename.endsWith(".js")
								? path.basename(filename, ".js")
								: filename;
							const outputFile =
								this.options.renameExt && !filename.endsWith(".user.js")
									? filename.replace(/\.js$/, "") + ".user.js"
									: filename;
							const metaFile = basename + ".meta.js";

							const data = {
								hash,
								chunkHash: chunk.hash,
								chunkName: chunk.name,
								file,
								filename,
								basename,
								query,
								buildNo: ++this.buildNo,
								buildTime: Date.now(),
								...packageInfoObj
							};

							const tplHeaderObj = headerProvider(data);
							if (!tplHeaderObj.downloadURL && this.options.downloadBaseUrl) {
								tplHeaderObj.downloadURL = new URL(outputFile, this.options.downloadBaseUrl).toString();
							}
							if (!tplHeaderObj.updateURL && this.options.updateBaseUrl) {
								tplHeaderObj.updateURL = !this.options.metajs
									? tplHeaderObj.downloadURL
									: new URL(metaFile, this.options.updateBaseUrl).toString();
							}

							const headerObj = interpolate(tplHeaderObj, data);
							const headerString = userscriptMeta.stringify(headerObj, this.options.pretty);

							if (outputFile !== file) {
								delete compilation.assets[file];
							}

							// Prepending user script data to
							compilation.updateAsset(
								file,
								(old) => new RawSource(headerString + "\n" + old.source().toString())
							);
						}
					}
				}
			);
		});

		compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, (compilation, callback) => {
			for (const fileDependency of fileDependencies) {
				// Add file dependencies if they're not already tracked
				if (!compilation.fileDependencies.has(fileDependency)) {
					compilation.fileDependencies.add(fileDependency);
				}
			}
			callback();
		});
	}
};

new WebpackUserscript();
