const fs = require("node:fs/promises");
const { execSync } = require("node:child_process");

const PLANTUML_JAR = "../util/plantuml-mit-1.2025.10.jar";

const END_OF_STYLE = 9;
const FIRST_NON_PHYSICAL_LINE = "* Geistige Einschränkungen";

const fileWithOnlyBiggestCategories = [];
const fileWithFirstLevelInPhysical = [];
const fileWithOnlyPhiysical = [];

async function prepareFiles() {
  try {
    const data = await fs.readFile("mindmap.plantuml", { encoding: "utf8" });
    let endOfPhysicalReached = false;
    data.split("\n").forEach((line, index) => {
      if (index <= END_OF_STYLE) {
        fileWithOnlyBiggestCategories.push(line);
        fileWithFirstLevelInPhysical.push(line);
        fileWithOnlyPhiysical.push(line);
        return;
      }
      if (!line.match(/^\t{2,}\*.*/)) {
        fileWithOnlyBiggestCategories.push(line);
      }
      if (line.includes(FIRST_NON_PHYSICAL_LINE)) {
        endOfPhysicalReached = true;
        console.log("Reached end of physical symptoms at line", index + 1);
      }
      if (!endOfPhysicalReached) {
        if (!line.match(/^\t{3,}\*.*/)) {
          fileWithFirstLevelInPhysical.push(line);
        }
        fileWithOnlyPhiysical.push(line);
      }

      console.log(`${index + 1}: ${line}`);
    });
    fileWithFirstLevelInPhysical.push("@enduml");
    fileWithOnlyPhiysical.push("@enduml");
  } catch (err) {
    console.error(err);
  }
}

async function writeFiles() {
  try {
    await fs.writeFile(
      "mindmap-only-biggest-categories.plantuml",
      fileWithOnlyBiggestCategories.join("\n"),
      { encoding: "utf8" }
    );
    await fs.writeFile(
      "mindmap-first-level-in-physical.plantuml",
      fileWithFirstLevelInPhysical.join("\n"),
      { encoding: "utf8" }
    );
    await fs.writeFile(
      "mindmap-only-physical.plantuml",
      fileWithOnlyPhiysical.join("\n"),
      { encoding: "utf8" }
    );
  } catch (err) {
    console.error(err);
  }
}

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

function generateImages() {
  generateImageWithPlantuml("mindmap.plantuml");
  generateImageWithPlantuml("mindmap-only-biggest-categories.plantuml");
  generateImageWithPlantuml("mindmap-first-level-in-physical.plantuml");
  generateImageWithPlantuml("mindmap-only-physical.plantuml");
}

async function cleanUp() {
  try {
    await fs.unlink("mindmap-only-biggest-categories.plantuml");
    await fs.unlink("mindmap-first-level-in-physical.plantuml");
    await fs.unlink("mindmap-only-physical.plantuml");
    console.log("Temporary files deleted.");
  } catch (err) {
    console.error(err);
  }
}
async function run() {
  await prepareFiles();
  await writeFiles();
  await generateImages();
  await cleanUp();
}

run();
