const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");
const { send } = require("node:process");

const PLANTUML_JAR = "../util/plantuml-mit-1.2025.10.jar";

const FILE_HEADER = `
@startmindmap
<style>
mindmapDiagram{
	.blue {
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
    lines.push("\t".repeat(indent) + "* " + nameOfRoot + " <<blue>>");
    indent += 1;
  } else {
    prefix = "\t".repeat(indent) + "* ";
  }
  if (depth > 0) {
    for (const [index, [key, value]] of Object.entries(obj).entries()) {
      lines.push(prefix + key + (indent === 0 ? " <<blue>>" : ""));

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

function generateImageWithPlantuml(inputFile) {
  const cmd = `java -jar "${PLANTUML_JAR}" -tpng -o generated "${inputFile}" -DPLANTUML_LIMIT_SIZE=24384`;
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
  settings.depth = settings.depth || 999;
  settings.nameOfRoot = settings.nameOfRoot || null;
  settings.sendLeftAfter = settings.sendLeftAfter || 999;

  await createAndWriteFile(`${filename}.plantuml`, tree, settings);
  generateImageWithPlantuml(`${filename}.plantuml`);
  await deleteOldFile(`${filename}.plantuml`);
};

const run = async () => {
  const tree = await loadTree("mindmap.json");
  create("mindmap", tree, { sendLeftAfter: 1 });

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
};
run();
