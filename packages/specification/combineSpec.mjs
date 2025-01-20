// eslint-disable-line no-console
/*global console*/

import pkg from 'yaml'
const { parse, stringify } = pkg
import { readFileSync, writeFileSync } from 'fs'
import { isEqual } from 'lodash-es'

const PRESCRIBING_SPEC='./fhir-prescribing.yaml'
const DISPENSING_SPEC='./fhir-dispensing.yaml'
const TEMPLATE_SPEC='./electronic-prescription-service-api.template.yaml'
const COMBINED_SPEC='./electronic-prescription-service-api.new.yaml'
const OLD_SPEC='./electronic-prescription-service-api.yaml'

// list of paths that will not be added to the combined spec
// these are in the source specs to allow correct paths to be corrected in Apigee
const exclusionList = ['/FHIR/R4/$process-message', '/FHIR/R4/Task', '/FHIR/R4/$validate']

const rawPrescribing = readFileSync(PRESCRIBING_SPEC, 'utf8')
const rawDispensing = readFileSync(DISPENSING_SPEC, 'utf8')
const rawTemplate = readFileSync(TEMPLATE_SPEC, 'utf8')
const prescribing = parse(rawPrescribing)
const dispensing = parse(rawDispensing)
const template = parse(rawTemplate)

// add the paths
console.log("Adding prescribing.paths")
for (const [key, value] of Object.entries(prescribing.paths)) {
    const existingValue = template.paths[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    if (exclusionList.indexOf(key) >= 0) {
        console.log(`not adding ${key} as it is in exclusion list`)
    } else {
        delete value["post"]["security"]
        template.paths[key] = value
    }
}

console.log("Adding dispensing.paths")
for (const [key, value] of Object.entries(dispensing.paths)) {
    const existingValue = template.paths[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    if (exclusionList.indexOf(key) >= 0) {
        console.log(`not adding ${key} as it is in exclusion list`)
    } else {
        delete value["post"]["security"]
        template.paths[key] = value
    }
}

// add the parameters
console.log("Adding prescribing.components.parameters")
for (const [key, value] of Object.entries(prescribing.components.parameters)) {
    const existingValue = template.components.parameters[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    template.components.parameters[key] = value
}

console.log("Adding dispensing.components.parameters")
for (const [key, value] of Object.entries(dispensing.components.parameters)) {
    const existingValue = template.components.parameters[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    template.components.parameters[key] = value
}

// add the schemas
console.log("Adding prescribing.components.schemas")
for (const [key, value] of Object.entries(prescribing.components.schemas)) {
    const existingValue = template.components.schemas[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    template.components.schemas[key] = value
}

console.log("Adding dispensing.components.schemas")
for (const [key, value] of Object.entries(dispensing.components.schemas)) {
    const existingValue = template.components.schemas[key]
    if (existingValue && JSON.stringify(existingValue) !== JSON.stringify(value)) {
        throw new Error(`Duplicate key ${key} and values are different`)
    }
    template.components.schemas[key] = value
}

writeFileSync(COMBINED_SPEC, stringify(template))

// this is used to compare new and old spec
// leaving this in for now in case there are further changes to existing spec
// but it should be removed before merging and old spec deleting
const oldRawSpec = readFileSync(OLD_SPEC, 'utf8')
let oldSpec = parse(oldRawSpec)

// helper function to get diffs
function getObjectDiff(obj1, obj2) {
    const diff = Object.keys(obj1).reduce((result, key) => {
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
            result.push(key);
        } else if (isEqual(obj1[key], obj2[key])) {
            const resultKeyIndex = result.indexOf(key);
            result.splice(resultKeyIndex, 1);
        }
        return result;
    }, Object.keys(obj2));

    return diff;
}

const oldNewDifferences = getObjectDiff(
    oldSpec.paths, 
    template.paths
)
console.log(`These keys are different between old and new spec: ${oldNewDifferences}`)


const differenceDetails = getObjectDiff(
    oldSpec.paths["/FHIR/R4/Task#withdraw"]["post"], 
    template.paths["/FHIR/R4/Task#withdraw"]["post"]
)
console.log(`difference details: ${differenceDetails}`)
