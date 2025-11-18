const { writeFile } = require("node:fs");
const fs = require("node:fs/promises");

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

async function run() {
  await prepareFiles();
  await writeFiles();
}

run();
