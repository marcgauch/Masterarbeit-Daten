const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");

const PLANTUML_JAR = "../util/plantuml-mit-1.2025.10.jar";

const FILE_HEADER = `
@startmindmap
<style>
mindmapDiagram{
	.root {
		BackgroundColor LightBlue
	}
  .orange {
    BackgroundColor orange
  }
}
</style>
`;

const classesStartingFromThisDate = {
  "0000-01-01": null,
  "2025-11-26": "<<orange>>"
}

const POSSIBLE_PARAMETER = ['-keep-plantuml', '-generate-latex', '-ignore-date', '-debug', '-help']

const PARAMS = ((args) => {
  const argsBackupForDebug = [...args]

  const settings = {
    keep_plantuml: false,
    generate_latex: false,
    ignore_date: false,
    debug: false,
    help: false
  };

  POSSIBLE_PARAMETER.forEach(param => {

    if (args.includes(param)) {
      settings[param.slice(1).replaceAll(/-/g, "_")] = true
      args = args.filter(e => e !== param)
    }

  });
  if (settings.debug) {
    console.log("=== ARGS ===")
    console.log("=given=")
    console.log(argsBackupForDebug)
    console.log("=parsed=")
    console.log(settings)
  }


  if (args.length > 0) {
    const error = `Args contains unknown element${args.length > 1 ? "s" : ""}:\r\n${args.join("\r\n")}`
    throw error
  }

  if (settings.debug) {
    settings.keep_plantuml = true
  }

  return settings

})(process.argv.slice(2))

if (PARAMS.help) {
  console.log("Possible Parameter:")
  console.log(POSSIBLE_PARAMETER.join("\r\n"))
  console.log("Terminated. Start without -help")
  return
}


const getMatchingClassAccordingToDate = date => {
  if (!date) return ""
  if (date === '1970-01-01') return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const message = `${date} does not match YYYY-MM-DD`
    throw message
  };
  let lastMatchingClass = null
  for (key of Object.keys(classesStartingFromThisDate)) {
    if (key > date) {
      return lastMatchingClass
    }
    lastMatchingClass = classesStartingFromThisDate[key]
  }
  return lastMatchingClass
}

const loadTree = async (filename) => {
  const data = await fs.readFile(filename, { encoding: "utf8" });
  if (PARAMS.debug) {
    console.log()
    console.log("loaded Tree:")
    console.log("=== START OF TREE===")
    console.log(data)
    console.log("===END OF TREE===")
  }
  return JSON.parse(data);
};

function treeToPlantUML(
  obj,
  indent = 0,
  depth,
  nameOfRoot = null,
  sendLeftAfter
) {
  const lines = [];
  let prefix = "\t".repeat(indent + 1) + "* ";

  if (nameOfRoot) {
    lines.push("\t".repeat(indent) + "* " + nameOfRoot + " <<root>>");
    indent += 1;
  } else {
    prefix = "\t".repeat(indent) + "* ";
  }
  if (depth > 0) {
    for (const [index, [key, value]] of Object.entries(obj).entries()) {

      if (key === "_date") continue

      let classOfThisElement = (indent === 0)
        ? "<<root>>"
        : getMatchingClassAccordingToDate(value._date)

      lines.push(prefix + key + classOfThisElement);


      if (value && typeof value === "object" && Object.keys(value).length > 0) {
        const nextNested = treeToPlantUML(value, indent + 1, depth - 1, null, sendLeftAfter)
        if (nextNested.length > 0) {
          lines.push(
            nextNested
          );
        }
      }
      if (indent === 1 && index === sendLeftAfter) {
        lines.push("left side");
      }
    }
  }
  return lines.join("\n");
}

const createContent = async (tree, settings) => {
  const lines = [FILE_HEADER];
  const sendLeftAfter =
    settings.sendLeftAfter === "half"
      ? Math.ceil(Object.keys(tree).length / 2) -1
      : settings.sendLeftAfter;
  const markdownContent = treeToPlantUML(
    tree,
    0,
    settings.depth,
    settings.nameOfRoot,
    sendLeftAfter
  );
  lines.push(markdownContent);
  lines.push("@endmindmap");
  return lines.join("\n");
};

const createAndWriteFile = async (filename, tree, settings) => {
  const content = await createContent(tree, settings);
  try {
    await fs.writeFile(filename, content, { encoding: "utf8" });
    if (PARAMS.debug) {
      console.log(`File ${filename} written successfully.`);
    }
  } catch (err) {
    console.error(`Error writing file ${filename}:`, err);
  }
};

function generateImageWithPlantuml(inputFile, savePath = "") {
  const cmd = `java -jar "${PLANTUML_JAR}" -tpng -o ../generated${savePath} "${inputFile}" -DPLANTUML_LIMIT_SIZE=24384`;
  execSync(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(
        `Error generating image for ${inputFile}: ${error.message}`
      );
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`Image generated for ${inputFile}: ${stdout}`);
  });
}

//const create = async (filename, tree, depth = 999, nameOfRoot = null) => {
const create = async (filename, tree, settings = {}) => {
  if (!filename || !tree) {
    console.error("Filename and tree are required.");
    return;
  }


  if (typeof (tree) === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tree)) {
    // empty iteration over the _date property..
    return
  }

  settings.depth = settings.depth ?? 999;
  settings.nameOfRoot = settings.nameOfRoot || null;
  settings.sendLeftAfter = settings.sendLeftAfter ?? 999;

  await createAndWriteFile(`plantuml/${filename}.plantuml`, tree, settings);
  generateImageWithPlantuml(`plantuml/${filename}.plantuml`, settings.savePath);
};

const deleteDir = async (path) => {
  try {
    await fs.rm(path, { recursive: true });
    if (PARAMS.debug) {
      console.log(`Old dir '${path}' deleted successfully.`);
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Error deleting directory '${dir}'`, err);
    }
  }
};

const createDir = async (path) => {
  try {
    await fs.mkdir(path, { recursive: true })
    if (PARAMS.debug) {
      console.log(`Directory ${path} created`);

    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Error creating directory '${dir}'`, err);
    }
  }
}



const run = async () => {
  await deleteDir("generated");
  await deleteDir("plantuml")
  await createDir("plantuml")
  const tree = await loadTree("mindmap.json");
  create("mindmap", tree["Einschränkungen"], {
    nameOfRoot: "Einschränkungen",
    sendLeftAfter: 1,
  });

  create(
    "mindmap-only-physical",
    tree["Einschränkungen"]["Körperliche Einschränkungen"],
    { nameOfRoot: "Körperliche Einschränkungen", sendLeftAfter: 6 }
  );
  create(
    "mindmap-first-level-in-physical",
    tree["Einschränkungen"]["Körperliche Einschränkungen"],
    {
      depth: 1,
      nameOfRoot: "Körperliche Einschränkungen",
      sendLeftAfter: "half",
    }
  );
  create("mindmap-only-biggest-categories", tree["Einschränkungen"], {
    depth: 1,
    nameOfRoot: "Einschränkungen",
    sendLeftAfter: 2,
  });

  // create mindmaps for every main category in Körperliche Einschränkungen
  for (const [key, value] of Object.entries(
    tree["Einschränkungen"]["Körperliche Einschränkungen"]
  )) {
    const keyCleaned = key
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
    create(`mindmap-physical-${keyCleaned}`, value, {
      nameOfRoot: key,
      sendLeftAfter: "half",
      savePath: "/physical-subcategories",
    });
    if (PARAMS.generate_latex) {
      console.log(`
\\begin{figure}[H]
  \\caption{Mindmap der Elemente der Unterkategorie \\enquote{${key}} der körperlichen Einschränkungen}
  \\includegraphics[width=\\textwidth]{content/00_assets/mindmaps/physical-subcategories/mindmap-physical-${keyCleaned}.png}
  \\note{Eigene Abbildung}
  \\label{fig:mindmap-physical-${keyCleaned}}
\\end{figure}`);
    }
  }

  // create mindmaps for every category in physical > Sinne
  for (const [key, value] of Object.entries(
    tree["Einschränkungen"]["Körperliche Einschränkungen"]["Sinne"]
  )) {
    const keyCleaned = key
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
    create(`mindmap-physical-sinne-${keyCleaned}`, value, {
      nameOfRoot: key,
      sendLeftAfter: "half",
      savePath: "/physical-subcategories/sinne",
    });
    if (PARAMS.generate_latex) {
      console.log(`
\\begin{figure}[H]
  \\caption{Mindmap der Elemente der Unterkategorie \\enquote{${key}} der körperlichen Einschränkungen im Bereich Sinne}
  \\includegraphics[width=\\textwidth]{content/00_assets/mindmaps/physical-subcategories/sinne/mindmap-physical-sinne-${keyCleaned}.png}
  \\note{Eigene Abbildung}
  \\label{fig:mindmap-physical-sinne-${keyCleaned}}
\\end{figure}`);
    }
  }
  if (!PARAMS.keep_plantuml) {
    deleteDir("plantuml")
  }
};

run();
