import publisher, { PublisherOptions } from "@pact-foundation/pact-node";
import * as cp from "child_process";
import { resolve } from "path";

let revision: string = "";
let branch: string = "";
let artifactTag: string = "";
let opts: PublisherOptions;
const PACT_BROKER_URL: string = process.env.PACT_BROKER_URL || "";
const PACT_BROKER_BASIC_AUTH_USERNAME: string = process.env.PACT_BROKER_BASIC_AUTH_USERNAME || "";
const PACT_BROKER_BASIC_AUTH_PASSWORD: string = process.env.PACT_BROKER_BASIC_AUTH_PASSWORD || "";

main();

function getOpts() {
  const consumerVersion = artifactTag + "-" + revision;
  opts = {
    pactFilesOrDirs: [resolve(process.cwd(), "pact/pacts")],
    pactBroker: PACT_BROKER_URL,
    pactBrokerUsername: PACT_BROKER_BASIC_AUTH_USERNAME,
    pactBrokerPassword: PACT_BROKER_BASIC_AUTH_PASSWORD,
    consumerVersion: consumerVersion,
    tags: [branch]
  };
}

function main() {
  getBranch();
  getRevision();
  getTags();
  getOpts();
  performPublish();
}

function performPublish() {
  console.log(opts)

  publisher
    .publishPacts(opts)
    .then(() => {
      console.log("successfully published pacts");
      return process.exit(0);
    })
    .catch((error: any) => {
      console.log("failed to publish pacts");
      console.log(error)
      return process.exit(1);
    });
}

function getRevision() {
  try {
    return (revision = cp
      .execSync("git rev-parse --short HEAD")
      .toString()
      .trim());
  } catch (Error) {
    throw new TypeError(
      "Couldn't find a git commit hash, is this a git directory?"
    );
  }
}

function getBranch() {
  try {
    branch = "pr" 
    // return (branch = cp
    //   .execSync("git rev-parse --abbrev-ref HEAD")
    //   .toString()
    //   .trim());
  } catch (Error) {
    throw new TypeError("Couldn't find a git branch, is this a git directory?");
  }
}
function getTags() {
  try {
    artifactTag = "v1.0.44-alpha"
      // cp
      // .execSync("git describe")
      // .toString()
      // .trim();
  } catch (Error) {
    const errorMessage = Error.message;
    if (errorMessage.indexOf("fatal") >= 0) {
        throw new TypeError("Couldn't find a git tag");
    }
  }
}