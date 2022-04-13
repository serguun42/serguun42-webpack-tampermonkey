import {Compiler, Plugin} from 'webpack';

declare namespace WebpackUserscript {
  type WebpackUserscriptOptions =
    | WPUSOptions
    | HeaderFile // shorthand for WPUSOptions.headers
    | HeaderProvider; // shorthand for WPUSOptions.headers

  interface WPUSOptions {
    headers?: HeaderFile | HeaderProvider | HeaderObject;

    /**
     * Output *.meta.js files or not.
     * Defaults to true.
     */
    metajs?: boolean;

    /**
     * Rename all .js files to .user.js files or not.
     * Defaults to true.
     */
    renameExt?: boolean;

    /**
     * Prettify the header or not.
     * Defaults to true.
     */
    pretty?: boolean;

    /**
     * Base URL for downloadURL.
     * If not provided, it will be set to `updateBaseUrl` if `updateBaseUrl` is provided.
     */
    downloadBaseUrl?: string;

    /**
     * Base URL for updateURL.
     * If not provided, it will be set to `downloadBaseUrl` if `downloadBaseUrl` is provided.
     */
    updateBaseUrl?: string;
  }

  type HeaderFile = string;

  type HeaderProvider = (data: DataObject) => HeaderObject;

  interface HeaderObject {
    name?: string;

    namespace?: string;

    version?: string;

    author?: string;

    description?: string;

    homepage?: string;
    homepageURL?: string;
    website?: string;
    source?: string;

    icon?: string;
    iconURL?: string;
    defaulticon?: string;

    icon64?: string;
    icon64URL?: string;

    updateURL?: string;

    downloadURL?: string | 'none';
    installURL?: string;

    supportURL?: string;

    include?: string | string[];

    match?: string | string[];

    exclude?: string | string[];

    require?: string | string[];

    resource?: string | string[];

    connect?: string | string[];

    'run-at'?: 'document-start' | 'document-body' | 'document-end' | 'document-idle' | 'context-menu';

    grant?: string | string[] | 'none';

    webRequest?: string;

    noframes?: boolean;

    unwrap?: boolean;

    nocompat?: boolean | string;

    [field: string]: string | string[] | boolean | undefined; // For any other field not listed above.;
  }

  interface DataObject {
    /**
     * Hash of Webpack compilation.
     */
    hash: string;

    /**
     * Webpack chunk hash.
     */
    chunkHash: string;

    /**
     * Webpack chunk name.
     */
    chunkName: string;

    /**
     * Entry file path, which may contain queries.
     */
    file: string;

    /**
     * Just like `file` but without queries.
     */
    filename: string;

    /**
     * Just like `filename` but without file extension, i.e. ".user.js" or ".js".
     */
    basename: string;

    /**
     * Query string.
     */
    query: string;

    /**
     * Build number.
     */
    buildNo: number;

    /**
     * The 13-digits number represents the time the script is built.
     */
    buildTime: number;

    /**
     * Info from package.json.
     */
    name: string;
    version: string;
    description: string;
    author: string;
    homepage: string;
    bugs: string; // URL
  }
}

declare class WebpackUserscript extends Plugin {
  constructor(options?: WebpackUserscript.WebpackUserscriptOptions);

  apply(compiler: Compiler): void;
}

export = WebpackUserscript;
