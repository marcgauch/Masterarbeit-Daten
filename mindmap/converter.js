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
}
</style>
`;

const loadTree = async (filename) => {
  const data = await fs.readFile(filename, { encoding: "utf8" });
  return JSON.parse(data);
};

function treeToMarkdown(
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
      lines.push(prefix + key + (indent === 0 ? " <<root>>" : ""));

      if (value && typeof value === "object" && Object.keys(value).length > 0) {
        lines.push(
          treeToMarkdown(value, indent + 1, depth - 1, null, sendLeftAfter)
        );
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
  const markdownContent = treeToMarkdown(
    tree,
    0,
    settings.depth,
    settings.nameOfRoot,
    settings.sendLeftAfter
  );
  lines.push(markdownContent);
  lines.push("@endmindmap");
  return lines.join("\n");
};

const createAndWriteFile = async (filename, tree, settings) => {
  const content = await createContent(tree, settings);
  try {
    await fs.writeFile(filename, content, { encoding: "utf8" });
    console.log(`File ${filename} written successfully.`);
  } catch (err) {
    console.error(`Error writing file ${filename}:`, err);
  }
};

function generateImageWithPlantuml(inputFile, savePath = "") {
  const cmd = `java -jar "${PLANTUML_JAR}" -tpng -o generated${savePath} "${inputFile}" -DPLANTUML_LIMIT_SIZE=24384`;
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

const deleteOldFile = async (filename) => {
  try {
    await fs.unlink(filename);
    console.log(`Old file ${filename} deleted successfully.`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Error deleting file ${filename}:`, err);
    }
  }
};

//const create = async (filename, tree, depth = 999, nameOfRoot = null) => {
const create = async (filename, tree, settings = {}) => {
  if (!filename || !tree) {
    console.error("Filename and tree are required.");
    return;
  }
  settings.depth = settings.depth ?? 999;
  settings.nameOfRoot = settings.nameOfRoot || null;
  settings.sendLeftAfter = settings.sendLeftAfter ?? 999;

  await createAndWriteFile(`${filename}.plantuml`, tree, settings);
  generateImageWithPlantuml(`${filename}.plantuml`, settings.savePath);
  await deleteOldFile(`${filename}.plantuml`);
};

const deleteOldOutputDir = async () => {
  try {
    await fs.rmdir("generated", { recursive: true });
    console.log("Old generated directory deleted successfully.");
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Error deleting generated directory:", err);
    }
  }
};

const run = async () => {
  await deleteOldOutputDir();
  const tree = await loadTree("mindmap.json");
  create("mindmap", tree["Einschränkungen"], {
    nameOfRoot: "Einschränkungen",
    sendLeftAfter: 0,
  });

  create(
    "mindmap-only-physical",
    tree["Einschränkungen"]["Körperliche Einschränkungen"],
    { nameOfRoot: "Körperliche Einschränkungen", sendLeftAfter: 5 }
  );
  create(
    "mindmap-first-level-in-physical",
    tree["Einschränkungen"]["Körperliche Einschränkungen"],
    { depth: 1, nameOfRoot: "Körperliche Einschränkungen" }
  );
  create("mindmap-only-biggest-categories", tree["Einschränkungen"], {
    depth: 1,
    nameOfRoot: "Einschränkungen",
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
      sendLeftAfter: Math.floor(Object.keys(value).length / 2) - 1,
      savePath: "/physical-subcategories",
    });
    console.log(`
\\begin{figure}[H]
  \\caption{Mindmap der Elemente der Unterkategorie \\enquote{${key}} der körperlichen Einschränkungen}
  \\includegraphics[width=\\textwidth]{content/00_assets/mindmaps/physical-subcategories/mindmap-physical-${keyCleaned}.png}
  \\note{Eigene Abbildung}
  \\label{fig:mindmap-physical-${keyCleaned}}
\\end{figure}`);
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
      sendLeftAfter: Math.floor(Object.keys(value).length / 2) - 1,
      savePath: "/physical-subcategories/sinne",
    });
    console.log(`
\\begin{figure}[H]
  \\caption{Mindmap der Elemente der Unterkategorie \\enquote{${key}} der körperlichen Einschränkungen im Bereich Sinne}
  \\includegraphics[width=\\textwidth]{content/00_assets/mindmaps/physical-subcategories/sinne/mindmap-physical-sinne-${keyCleaned}.png}
  \\note{Eigene Abbildung}
  \\label{fig:mindmap-physical-sinne-${keyCleaned}}
\\end{figure}`);
  }
};
run();
